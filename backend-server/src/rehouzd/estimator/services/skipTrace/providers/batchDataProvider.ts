import logger from '../../../utils/logger';
import { AppError } from '../../../middleware/errorHandler';
import batchDataClient, { 
  BatchDataSkipTraceRequest, 
  BatchDataPropertyRequest,
  BatchDataResponse,
  BatchDataEmail,
  BatchDataPhoneNumber
} from '../../../utils/api/batchDataClient';
import {
  SkipTraceProvider,
  SkipTraceRequest,
  SkipTraceResponse,
  SkipTraceAddress,
  StandardizedOwner,
  StandardizedPhoneNumber,
  StandardizedEmail,
  StandardizedAddress,
  StandardizedPropertyResult,
  ProviderConfig,
} from '../../../interfaces/skipTraceProviders';

export class BatchDataProvider extends SkipTraceProvider {
  constructor(config: ProviderConfig) {
    super(config);
    logger.info('BatchData Provider initialized', {
      provider: 'batchdata',
      timeout: config.timeout || 60000
    });
  }

  async performSkipTrace(request: SkipTraceRequest): Promise<SkipTraceResponse> {
    try {
      logger.info('Starting BatchData skip trace (sequential)', {
        provider: 'batchdata',
        addressCount: request.addresses.length,
        buyerName: request.buyerName
      });

      // Use sequential processing instead of batch
      return await this.sequentialPropertyLookup(request);
    } catch (error: any) {
      logger.error('BatchData skip trace failed', {
        provider: 'batchdata',
        error: error.message,
        statusCode: error.statusCode || 500,
        addressCount: request.addresses.length
      });
      return {
        results: [],
        totalResults: 0,
        successful: 0,
        failed: request.addresses.length,
        provider: 'batchdata',
        isAsync: false
      };
    }
  }

  validateConfig(): boolean {
    return true;
  }

  async testConnection(): Promise<boolean> {
    try {
      return await batchDataClient.testConnection();
    } catch (error: any) {
      logger.error('BatchData connection test failed', { 
        provider: 'batchdata',
        error: error.message 
      });
      return false;
    }
  }

  private convertFromBatchDataFormat(
    response: BatchDataResponse,
    buyerName?: string
  ): SkipTraceResponse {
    try {
      logger.debug('🔍 BatchData Response Analysis', {
        provider: 'batchdata',
        statusCode: response.status?.code,
        statusText: response.status?.text,
        personsCount: response.results?.persons?.length || 0,
        hasPersons: !!response.results?.persons
      });

      if (!response.results || !response.results.persons || response.results.persons.length === 0) {
        logger.warn('No persons found in BatchData response', {
          provider: 'batchdata',
          hasResults: !!response.results,
          hasPersons: !!response.results?.persons
        });
        return {
          results: [],
          totalResults: 0,
          successful: 0,
          failed: 1,
          provider: 'batchdata',
          isAsync: false
        };
      }

      // Debug each person's contact info
      response.results.persons.forEach((person, index) => {
        logger.debug(`🔍 Person ${index + 1} Contact Info`, {
          provider: 'batchdata',
          personId: person._id,
          name: `${person.name?.first || ''} ${person.name?.last || ''}`.trim(),
          emailCount: person.emails?.length || 0,
          phoneCount: person.phoneNumbers?.length || 0,
          emails: person.emails?.map(e => e.email) || [],
          phones: person.phoneNumbers?.map(p => p.number) || [],
          propertyStreet: person.propertyAddress?.street
        });
      });

      const results: StandardizedPropertyResult[] = [];
      const groupedByProperty = this.groupPersonsByProperty(response.results.persons);

      let successful = 0;
      let failed = 0;

      for (const [propertyKey, persons] of Object.entries(groupedByProperty)) {
        logger.debug(`🏠 Processing property group: ${propertyKey}`, {
          provider: 'batchdata',
          personsInGroup: persons.length,
          personNames: persons.map(p => `${p.name?.first || ''} ${p.name?.last || ''}`.trim())
        });

        // Extract all contact info from all persons for this property
        const allEmails: string[] = [];
        const allPhones: string[] = [];

        persons.forEach(person => {
          if (person.emails && person.emails.length > 0) {
            person.emails.forEach((email: BatchDataEmail) => {
              if (email.email && !allEmails.includes(email.email)) {
                allEmails.push(email.email);
              }
            });
          }
          if (person.phoneNumbers && person.phoneNumbers.length > 0) {
            person.phoneNumbers.forEach((phone: BatchDataPhoneNumber) => {
              if (phone.number && !allPhones.includes(phone.number)) {
                allPhones.push(phone.number);
              }
            });
          }
        });

        logger.debug(`📞 Contact info aggregated for property`, {
          provider: 'batchdata',
          propertyKey,
          totalEmails: allEmails.length,
          totalPhones: allPhones.length,
          emails: allEmails,
          phones: allPhones
        });

        const hasContactInfo = allEmails.length > 0 || allPhones.length > 0;

        if (hasContactInfo) {
          const standardizedOwners = this.convertPersonsToOwners(persons, buyerName);
          const firstPerson = persons[0];
          
          results.push({
            propertyAddress: this.formatPropertyAddress(firstPerson.propertyAddress),
            apn: undefined,
            owners: standardizedOwners,
            statusCode: 200,
            success: true,
            sourceProvider: 'batchdata'
          });
          successful++;

          logger.info('✅ Property processed successfully', {
            provider: 'batchdata',
            propertyKey,
            ownersCount: standardizedOwners.length,
            emailsFound: allEmails.length,
            phonesFound: allPhones.length
          });
        } else {
          const firstPerson = persons[0];
          results.push({
            propertyAddress: this.formatPropertyAddress(firstPerson.propertyAddress),
            apn: undefined,
            owners: [],
            statusCode: 400,
            success: false,
            errors: ['No contact information found'],
            sourceProvider: 'batchdata'
          });
          failed++;

          logger.warn('❌ Property has no contact info', {
            provider: 'batchdata',
            propertyKey,
            personsCount: persons.length
          });
        }
      }

      logger.info('🎯 BatchData conversion completed', {
        provider: 'batchdata',
        totalResults: results.length,
        successful,
        failed,
        propertiesProcessed: Object.keys(groupedByProperty).length
      });

      return {
        results,
        totalResults: results.length,
        successful,
        failed,
        provider: 'batchdata',
        isAsync: false
      };
    } catch (error: any) {
      logger.error('Error converting BatchData response', {
        provider: 'batchdata',
        error: error.message
      });
      throw new AppError('Failed to process BatchData response', 500);
    }
  }

  private async sequentialPropertyLookup(request: SkipTraceRequest): Promise<SkipTraceResponse> {
    let aggregatedResults: StandardizedPropertyResult[] = [];
    let allOwners: StandardizedOwner[] = [];
    let successful = 0;
    let failed = 0;

    const maxProperties = Math.min(3, request.addresses.length);

    for (let i = 0; i < maxProperties; i++) {
      const address = request.addresses[i];
      logger.info(`🔍 Processing property ${i + 1}/${maxProperties}`, {
        provider: 'batchdata',
        address: `${address.street}, ${address.city}, ${address.state}`,
        buyerName: request.buyerName
      });

      try {
        // Create single-property request
        const singlePropertyRequest = {
          requests: [{
            propertyAddress: {
              street: address.street || '',
              city: address.city || '',
              state: address.state || '',
              zip: address.zipCode || ''
            }
          }]
        };

        // Make API call for single property
        const response = await batchDataClient.skipTraceDirect(singlePropertyRequest);
        
        logger.debug('📊 Single property response', {
          provider: 'batchdata',
          propertyIndex: i + 1,
          personsCount: response.data.results?.persons?.length || 0,
          requestId: response.data.results?.meta?.requestId
        });

        // Convert response for this property
        const propertyResponse = this.convertFromBatchDataFormat(response.data, request.buyerName);
        
        if (propertyResponse.successful > 0) {
          aggregatedResults.push(...propertyResponse.results);
          successful += propertyResponse.successful;

          // Extract owners from successful results
          for (const result of propertyResponse.results) {
            if (result.success && result.owners.length > 0) {
              allOwners.push(...result.owners);
            }
          }

          // Check if we found a good match with sufficient contact info
          const hasGoodMatch = this.hasGoodMatch(allOwners, request.buyerName);
          const hasSufficientInfo = this.hasSufficientContactInfo(allOwners);

          logger.debug('🎯 Match evaluation', {
            provider: 'batchdata',
            propertyIndex: i + 1,
            totalOwners: allOwners.length,
            hasGoodMatch,
            hasSufficientInfo,
            totalEmails: this.getUniqueEmails(allOwners).length,
            totalPhones: this.getUniquePhones(allOwners).length
          });

          if (hasGoodMatch && hasSufficientInfo) {
            logger.info('✅ Found sufficient contact info, stopping early', {
              provider: 'batchdata',
              propertiesProcessed: i + 1,
              totalOwners: allOwners.length,
              emailsFound: this.getUniqueEmails(allOwners).length,
              phonesFound: this.getUniquePhones(allOwners).length
            });
            break;
          }
        } else {
          failed += propertyResponse.failed;
          aggregatedResults.push(...propertyResponse.results);
        }

      } catch (error: any) {
        logger.warn(`❌ Failed to lookup property ${i + 1}`, {
          provider: 'batchdata',
          address: `${address.street}, ${address.city}, ${address.state}`,
          error: error.message
        });
        failed++;

        // If this is the last property and we have no contact info, use fallback
        if (i === maxProperties - 1 && allOwners.length === 0) {
          logger.info('📄 No matches found in any property, will return empty results', {
            provider: 'batchdata',
            propertiesChecked: i + 1,
            buyerName: request.buyerName
          });
        }
      }
    }

    // If we didn't find the buyer in any property but have results from first property, use those
    if (!this.hasGoodMatch(allOwners, request.buyerName) && aggregatedResults.length > 0) {
      const firstPropertyResults = aggregatedResults.filter(r => r.success);
      if (firstPropertyResults.length > 0) {
        logger.info('📋 Using fallback results from first property', {
          provider: 'batchdata',
          firstPropertyOwners: firstPropertyResults[0].owners.length,
          buyerName: request.buyerName
        });
      }
    }

    return {
      results: aggregatedResults,
      totalResults: aggregatedResults.length,
      successful,
      failed,
      provider: 'batchdata',
      isAsync: false
    };
  }

  private hasGoodMatch(owners: StandardizedOwner[], buyerName?: string): boolean {
    if (!buyerName || owners.length === 0) return false;

    // High confidence matches (company name or exact name matches)
    const hasHighConfidenceMatch = owners.some(owner => 
      owner.matchConfidence > 0.8 && (owner.matchType === 'exact' || owner.matchType === 'company_name')
    );

    // Business entity name match (for LLCs, etc.)
    const hasBusinessMatch = owners.some(owner => {
      const normalizedBuyer = this.normalizeCompanyName(buyerName);
      const normalizedOwner = this.normalizeCompanyName(owner.name);
      return normalizedBuyer === normalizedOwner;
    });

    // Fallback match with contact info
    const hasFallbackWithContacts = owners.some(owner => 
      owner.matchType === 'fallback' && (owner.emails.length > 0 || owner.phoneNumbers.length > 0)
    );

    const result = hasHighConfidenceMatch || hasBusinessMatch || hasFallbackWithContacts;
    
    logger.debug('🎯 Good match evaluation', {
      provider: 'batchdata',
      buyerName,
      hasHighConfidenceMatch,
      hasBusinessMatch,
      hasFallbackWithContacts,
      result,
      ownerNames: owners.map(o => o.name)
    });

    return result;
  }

  private hasSufficientContactInfo(owners: StandardizedOwner[]): boolean {
    const emails = this.getUniqueEmails(owners);
    const phones = this.getUniquePhones(owners);
    return emails.length >= 1 && phones.length >= 2; // Lowered threshold: 1 email + 2 phones
  }

  private getUniqueEmails(owners: StandardizedOwner[]): string[] {
    const emailSet = new Set<string>();
    owners.forEach(owner => {
      owner.emails.forEach(email => emailSet.add(email.email));
    });
    return Array.from(emailSet);
  }

  private getUniquePhones(owners: StandardizedOwner[]): string[] {
    const phoneSet = new Set<string>();
    owners.forEach(owner => {
      owner.phoneNumbers.forEach(phone => phoneSet.add(phone.number));
    });
    return Array.from(phoneSet);
  }

  private groupPersonsByProperty(persons: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    for (const person of persons) {
      const propertyKey = person.propertyAddress?.hash || 
        `${person.propertyAddress?.street}-${person.propertyAddress?.city}-${person.propertyAddress?.state}-${person.propertyAddress?.zip}`;
      
      if (!grouped[propertyKey]) {
        grouped[propertyKey] = [];
      }
      grouped[propertyKey].push(person);
    }
    
    return grouped;
  }

  private formatPropertyAddress(propertyAddress: any): string {
    if (!propertyAddress) return 'Unknown Address';
    
    const parts = [
      propertyAddress.street,
      propertyAddress.city,
      propertyAddress.state,
      propertyAddress.zip
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  private convertPersonsToOwners(
    persons: any[],
    buyerName?: string
  ): StandardizedOwner[] {
    const owners: StandardizedOwner[] = [];
    
    for (const person of persons) {
      // Properly format the person's name in Title Case
      const firstName = this.toTitleCase(person.name?.first || '');
      const lastName = this.toTitleCase(person.name?.last || '');
      const fullName = `${firstName} ${lastName}`.trim();
      
      const matchInfo = this.calculateMatch(buyerName, fullName, 'person');
      
      owners.push({
        id: person._id,
        name: fullName || 'Unknown Person',
        type: 'person',
        age: undefined,
        deceased: false,
        relationshipType: undefined,
        matchConfidence: matchInfo.confidence,
        matchType: matchInfo.matchType,
        phoneNumbers: this.convertPhoneNumbers(person.phoneNumbers || []),
        emails: this.convertEmails(person.emails || []),
        addresses: this.convertAddresses(person.mailingAddress ? [person.mailingAddress] : [])
      });

      // ALSO check if this person's property has an owner that matches the buyer
      if (person.property && person.property.owner && person.property.owner.name) {
        const propertyOwnerName = person.property.owner.name.full || person.property.owner.name.last || '';
        if (propertyOwnerName) {
          const propertyMatchInfo = this.calculateMatch(buyerName, propertyOwnerName, 'business');
          
          logger.debug('🏢 Property Owner Analysis', {
            provider: 'batchdata',
            propertyOwnerName,
            buyerName,
            matchConfidence: propertyMatchInfo.confidence,
            matchType: propertyMatchInfo.matchType
          });

          // If property owner matches buyer better than person name, create a business owner entry
          if (propertyMatchInfo.confidence > matchInfo.confidence) {
            owners.push({
              id: `${person._id}_property_owner`,
              name: this.toTitleCase(propertyOwnerName),
              type: 'business',
              age: undefined,
              deceased: false,
              relationshipType: 'Property Owner',
              matchConfidence: propertyMatchInfo.confidence,
              matchType: propertyMatchInfo.matchType,
              phoneNumbers: this.convertPhoneNumbers(person.phoneNumbers || []),
              emails: this.convertEmails(person.emails || []),
              addresses: this.convertAddresses(person.mailingAddress ? [person.mailingAddress] : [])
            });

            logger.info('🎯 Property owner match found!', {
              provider: 'batchdata',
              propertyOwnerName,
              buyerName,
              matchConfidence: propertyMatchInfo.confidence,
              contactPhones: person.phoneNumbers?.length || 0,
              contactEmails: person.emails?.length || 0
            });
          }
        }
      }
    }
    
    owners.sort((a, b) => b.matchConfidence - a.matchConfidence);
    return owners;
  }

  private toTitleCase(str: string): string {
    return str.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
  }

  private convertPhoneNumbers(phones: any[]): StandardizedPhoneNumber[] {
    return phones.map(phone => ({
      number: this.formatPhoneNumberForDisplay(phone.number),
      type: phone.type || 'Unknown',
      carrier: phone.carrier,
      lastSeen: undefined,
      isDNC: false,
      isLitigator: false,
    }));
  }

  private formatPhoneNumberForDisplay(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Format as +1 (XXX) XXX-XXXX for 10-digit US numbers
    if (digits.length === 10) {
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    
    // Format as +1 (XXX) XXX-XXXX for 11-digit numbers starting with 1
    if (digits.length === 11 && digits.startsWith('1')) {
      const tenDigits = digits.slice(1);
      return `+1 (${tenDigits.slice(0, 3)}) ${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`;
    }
    
    // Return with +1 prefix for other formats
    return digits ? `+1 ${digits}` : phone;
  }

  private convertEmails(emails: any[]): StandardizedEmail[] {
    return emails.map(email => ({
      email: email.email,
      type: 'Unknown',
    }));
  }

  private convertAddresses(addresses: any[]): StandardizedAddress[] {
    return addresses.map(addr => {
      if (typeof addr === 'string') {
        return {
          address: addr,
          type: 'Unknown',
        };
      }
      
      const addressParts = [
        addr.street || addr.streetNoUnit,
        addr.city,
        addr.state,
        addr.zip
      ].filter(Boolean);
      
      return {
        address: addressParts.join(', '),
        type: 'Mailing',
      };
    });
  }

  private calculateMatch(buyerName?: string, ownerName?: string, ownerType?: string): {
    confidence: number;
    matchType: 'exact' | 'fuzzy_name' | 'company_name' | 'fallback';
  } {
    if (!buyerName || !ownerName) {
      return { confidence: 0.3, matchType: 'fallback' };
    }
    if (ownerType === 'business') {
      return this.calculateBusinessMatch(buyerName, ownerName);
    } else {
      return this.calculatePersonMatch(buyerName, ownerName);
    }
  }

  private calculateBusinessMatch(buyerName: string, businessName: string): {
    confidence: number;
    matchType: 'exact' | 'fuzzy_name' | 'company_name' | 'fallback';
  } {
    const normalizedBuyer = this.normalizeCompanyName(buyerName);
    const normalizedBusiness = this.normalizeCompanyName(businessName);
    if (normalizedBuyer === normalizedBusiness) {
      return { confidence: 0.9, matchType: 'company_name' };
    }
    const buyerWords = normalizedBuyer.split(' ').filter(w => w.length > 2);
    const businessWords = normalizedBusiness.split(' ').filter(w => w.length > 2);
    if (buyerWords.length === 0 || businessWords.length === 0) {
      return { confidence: 0.3, matchType: 'fallback' };
    }
    const matchingWords = buyerWords.filter(word => 
      businessWords.some(bWord => bWord.includes(word) || word.includes(bWord))
    );
    if (matchingWords.length >= Math.min(buyerWords.length, businessWords.length) * 0.6) {
      return { confidence: 0.8, matchType: 'company_name' };
    }
    return { confidence: 0.3, matchType: 'fallback' };
  }

  private calculatePersonMatch(buyerName: string, personName: string): {
    confidence: number;
    matchType: 'exact' | 'fuzzy_name' | 'company_name' | 'fallback';
  } {
    const normalizedBuyer = this.normalizeName(buyerName);
    const normalizedPerson = this.normalizeName(personName);
    if (normalizedBuyer === normalizedPerson) {
      return { confidence: 1.0, matchType: 'exact' };
    }
    const buyerParts = normalizedBuyer.split(' ').filter(p => p.length > 1);
    const personParts = normalizedPerson.split(' ').filter(p => p.length > 1);
    if (buyerParts.length === 0 || personParts.length === 0) {
      return { confidence: 0.3, matchType: 'fallback' };
    }
    let matchingParts = 0;
    for (const buyerPart of buyerParts) {
      for (const personPart of personParts) {
        if (this.isPartialMatch(buyerPart, personPart)) {
          matchingParts++;
          break;
        }
      }
    }
    const score = matchingParts / Math.max(buyerParts.length, personParts.length);
    if (score > 0.7) {
      return { confidence: score, matchType: score > 0.9 ? 'exact' : 'fuzzy_name' };
    }
    return { confidence: 0.3, matchType: 'fallback' };
  }

  private normalizeCompanyName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[.,\-_]/g, ' ')
      .replace(/\b(llc|inc|corp|ltd|company|co)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[.,\-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isPartialMatch(part1: string, part2: string): boolean {
    const minLength = Math.min(part1.length, part2.length);
    if (minLength < 3) return part1 === part2;
    const similarity = this.calculateStringSimilarity(part1, part2);
    return similarity > 0.8;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator,
        );
      }
    }
    return matrix[str2.length][str1.length];
  }
} 