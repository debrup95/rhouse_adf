import { PropertyResult, PropertyOwner, EmailAddress, PhoneNumber } from '../../utils/api/leadSherpaClient';
import logger from '../../utils/logger';

export interface MatchedOwner {
  owner: PropertyOwner;
  confidence: number;
  matchType: 'exact' | 'fuzzy_name' | 'company_name' | 'fallback';
  propertyAddress: string;
}

export interface ContactInfo {
  emails: string[];
  phoneNumbers: string[];
  matchedOwners: MatchedOwner[];
}

class OwnerMatchingService {
  /**
   * Find matching owners across multiple property results
   */
  findMatchingOwners(buyerName: string, propertyResults: PropertyResult[]): ContactInfo {
    logger.info('Starting owner matching process', { 
      buyerName, 
      propertyCount: propertyResults.length 
    });

    const allMatches: MatchedOwner[] = [];

    for (const result of propertyResults) {
      if (result.status_code === 200 && result.property?.owners) {
        const propertyAddress = result.property.address?.delivery_line1 || 'Unknown Address';
        const matches = this.findMatchesInProperty(buyerName, result, propertyAddress);
        allMatches.push(...matches);
      }
    }

    // Sort by confidence score (highest first)
    allMatches.sort((a, b) => b.confidence - a.confidence);

    // Extract contact information
    const contactInfo = this.extractContactInfo(allMatches);

    logger.info('Owner matching completed', {
      buyerName,
      totalMatches: allMatches.length,
      emailsFound: contactInfo.emails.length,
      phonesFound: contactInfo.phoneNumbers.length,
      bestMatch: allMatches[0]?.matchType || 'none'
    });

    return contactInfo;
  }

  /**
   * Find matches within a single property result
   */
  private findMatchesInProperty(buyerName: string, result: PropertyResult, propertyAddress: string): MatchedOwner[] {
    const matches: MatchedOwner[] = [];
    const fallbackOwners: PropertyOwner[] = []; // Store owners for fallback

    for (const ownerGroup of result.property.owners) {
      // Check for business entity match first (highest priority)
      if (ownerGroup.business && ownerGroup.business.name) {
        if (this.isCompanyNameMatch(buyerName, ownerGroup.business.name)) {
          
          // Extract contact info from business and its associated persons
          const businessEmails = [...ownerGroup.business.emails];
          const businessPhones = [...ownerGroup.business.phone_numbers];
          const businessAddresses = [...ownerGroup.business.addresses];

          // Add contact info from associated persons (e.g., registered agents, officers)
          if (ownerGroup.business.associated_persons) {
            for (const associatedPerson of ownerGroup.business.associated_persons) {
              if (associatedPerson.person) {
                businessEmails.push(...associatedPerson.person.emails);
                businessPhones.push(...associatedPerson.person.phone_numbers);
                businessAddresses.push(...associatedPerson.person.addresses);
              }
            }
          }

          logger.debug('🏢 Business Entity Contact Extraction', {
            businessName: ownerGroup.business.name,
            directEmails: ownerGroup.business.emails.length,
            directPhones: ownerGroup.business.phone_numbers.length,
            associatedPersons: ownerGroup.business.associated_persons?.length || 0,
            totalEmailsExtracted: businessEmails.length,
            totalPhonesExtracted: businessPhones.length,
            buyerName
          });

          // Create a pseudo-owner from business entity with all contact info
          const pseudoOwner: PropertyOwner = {
            object_id: `business_${ownerGroup.business.name}`,
            person_name: {
              title: '',
              first_name: '',
              middle_name: '',
              last_name: ownerGroup.business.name,
              suffix: ''
            },
            age: 0,
            deceased: false,
            date_of_birth_month_year: '',
            relation_type: 'business',
            name: ownerGroup.business.name,
            addresses: businessAddresses,
            emails: businessEmails,
            phone_numbers: businessPhones
          };

          matches.push({
            owner: pseudoOwner,
            confidence: 0.9,
            matchType: 'company_name',
            propertyAddress
          });
        }
      }

      // Check for individual person match
      if (ownerGroup.person) {
        const person = ownerGroup.person;
        
        // Add to fallback list
        fallbackOwners.push(person);

        // Check if individual name matches buyer name
        const nameMatch = this.calculateNameMatchScore(buyerName, person.name);
        
        if (nameMatch.score > 0.7) {
          matches.push({
            owner: person,
            confidence: nameMatch.score,
            matchType: nameMatch.score > 0.9 ? 'exact' : 'fuzzy_name',
            propertyAddress
          });
        }
      }
    }

    // If no good matches found, use fallback strategy
    if (matches.length === 0 && fallbackOwners.length > 0) {
      // Use the last owner found as fallback (most recent property owner)
      const fallbackOwner = fallbackOwners[fallbackOwners.length - 1];
      matches.push({
        owner: fallbackOwner,
        confidence: 0.3,
        matchType: 'fallback',
        propertyAddress
      });
      
      logger.info('Using fallback owner for contact info', {
        buyerName,
        fallbackOwnerName: fallbackOwner.name,
        propertyAddress,
        totalOwnersChecked: fallbackOwners.length
      });
    }

    return matches;
  }

  /**
   * Check if buyer name matches company name
   */
  private isCompanyNameMatch(buyerName: string, companyName: string): boolean {
    const normalizedBuyer = this.normalizeCompanyName(buyerName);
    const normalizedCompany = this.normalizeCompanyName(companyName);

    // Direct substring match
    if (normalizedCompany.includes(normalizedBuyer) || normalizedBuyer.includes(normalizedCompany)) {
      return true;
    }

    // Split into words and check for significant overlap
    const buyerWords = normalizedBuyer.split(' ').filter(w => w.length > 2);
    const companyWords = normalizedCompany.split(' ').filter(w => w.length > 2);

    if (buyerWords.length === 0 || companyWords.length === 0) {
      return false;
    }

    const matchingWords = buyerWords.filter(word => 
      companyWords.some(compWord => compWord.includes(word) || word.includes(compWord))
    );

    // If more than half the words match, consider it a match
    return matchingWords.length >= Math.min(buyerWords.length, companyWords.length) * 0.6;
  }

  /**
   * Normalize company name for matching
   */
  private normalizeCompanyName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\b(llc|inc|corp|company|co|ltd|investment|investments)\b/g, '') // Remove common suffixes
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Calculate name match score between buyer and owner
   */
  private calculateNameMatchScore(buyerName: string, ownerName: string): { score: number; type: string } {
    if (!buyerName || !ownerName) {
      return { score: 0, type: 'none' };
    }

    const normalizedBuyer = this.normalizeName(buyerName);
    const normalizedOwner = this.normalizeName(ownerName);

    // Exact match
    if (normalizedBuyer === normalizedOwner) {
      return { score: 1.0, type: 'exact' };
    }

    // Split into name parts
    const buyerParts = normalizedBuyer.split(' ').filter(p => p.length > 1);
    const ownerParts = normalizedOwner.split(' ').filter(p => p.length > 1);

    if (buyerParts.length === 0 || ownerParts.length === 0) {
      return { score: 0, type: 'none' };
    }

    // Calculate matching parts
    let matchingParts = 0;
    for (const buyerPart of buyerParts) {
      for (const ownerPart of ownerParts) {
        if (this.isPartialMatch(buyerPart, ownerPart)) {
          matchingParts++;
          break;
        }
      }
    }

    const score = matchingParts / Math.max(buyerParts.length, ownerParts.length);
    
    // Bonus for last name matches (assuming last name is typically the last word)
    if (buyerParts.length > 0 && ownerParts.length > 0) {
      const buyerLastName = buyerParts[buyerParts.length - 1];
      const ownerLastName = ownerParts[ownerParts.length - 1];
      
      if (this.isPartialMatch(buyerLastName, ownerLastName)) {
        return { score: Math.min(1.0, score + 0.2), type: 'fuzzy_name' };
      }
    }

    return { score, type: score > 0.5 ? 'fuzzy_name' : 'weak' };
  }

  /**
   * Check if two name parts are a partial match
   */
  private isPartialMatch(part1: string, part2: string): boolean {
    if (part1 === part2) return true;
    
    // Handle initials (J vs John)
    if ((part1.length === 1 && part2.startsWith(part1)) || 
        (part2.length === 1 && part1.startsWith(part2))) {
      return true;
    }

    // Handle partial matches (Bob vs Robert)
    if (part1.length >= 3 && part2.length >= 3) {
      return part1.startsWith(part2.substring(0, 3)) || 
             part2.startsWith(part1.substring(0, 3));
    }

    return false;
  }

  /**
   * Normalize name for matching
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Extract contact information from matched owners
   */
  private extractContactInfo(matches: MatchedOwner[]): ContactInfo {
    const emails = new Set<string>();
    const phoneNumbers = new Set<string>();

    // Get contact info from matches, prioritizing by confidence
    for (const match of matches) {
      // Add emails (max 3)
      for (const email of match.owner.emails) {
        if (emails.size < 3) {
          emails.add(email.email_address);
        }
      }

      // Add phone numbers (3 limit)
      for (const phone of match.owner.phone_numbers) {
        // if (phoneNumbers.size < 3) {
        //     phoneNumbers.add(phone.local_format);
        //   }
        // }
        phoneNumbers.add(phone.local_format);
      }

      // Stop if we have enough contact info from high-confidence matches
      if ((emails.size >= 2 && phoneNumbers.size >= 2) && match.confidence > 0.8) {
        break;
      }
    }

    // If we still don't have enough, add from any remaining matches (including fallback)
    if (emails.size < 2 || phoneNumbers.size < 2) {
      for (const match of matches) {
        match.owner.emails.forEach(email => {
          if (emails.size < 3) emails.add(email.email_address);
        });
        
        match.owner.phone_numbers.forEach(phone => {
          phoneNumbers.add(phone.local_format);
        });
      }
    }

    logger.info('Contact info extraction completed', {
      totalMatches: matches.length,
      emailsExtracted: emails.size,
      phonesExtracted: phoneNumbers.size,
      matchTypes: matches.map(m => m.matchType).join(', ')
    });

    return {
      emails: Array.from(emails),
      phoneNumbers: Array.from(phoneNumbers),
      matchedOwners: matches.slice(0, 5) // Keep top 5 matches for debugging
    };
  }
}

export default new OwnerMatchingService(); 