import { query } from '../../config/db';
import leadSherpaClient, { PropertyLookupRequest } from '../../utils/api/leadSherpaClient';
import ownerMatchingService, { ContactInfo, MatchedOwner } from './ownerMatchingService';
import logger from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';

export interface SkipTraceRequest {
  buyerId: string;
  buyerName: string;
  inputData: {
    address?: string;
    ownerName?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  propertyAddresses?: string[]; // Array of property addresses from buyer's purchase history
}

export interface SkipTraceResult {
  lookupId: string;
  buyerId: string;
  buyerName: string;
  lookupDate: string;
  creditUsed: 'free' | 'paid' | 'cached';
  phones: Array<{
    number: string;
    type: string;
    confidence: 'High' | 'Medium' | 'Low';
    verification?: {
      verifiedCount: number;
      invalidCount: number;
      netScore: number;
      status: string;
    };
  }>;
  emails: Array<{
    email: string;
    type: string;
    confidence: 'High' | 'Medium' | 'Low';
  }>;
  addresses: Array<{
    address: string;
    type: string;
    confidence: 'High' | 'Medium' | 'Low';
  }>;
  compliance: {
    dncStatus: string;
    litigatorStatus: string;
  };
  apiResponseStatus: 'success' | 'failed' | 'no_data' | 'error';
  matchedOwners?: MatchedOwner[];
}

export interface SkipTraceResponse {
  success: boolean;
  lookupId?: string;
  result?: SkipTraceResult;
  error?: string;
  creditUsed: 'free' | 'paid' | 'cached';
  remainingCredits: {
    free: number;
    paid: number;
  };
}

class SkipTraceService {
  /**
   * Perform skip trace lookup with adaptive property search
   */
  async performSkipTrace(userId: number, request: SkipTraceRequest): Promise<SkipTraceResponse> {
    try {
      logger.info('Starting skip trace process', {
        userId,
        buyerId: request.buyerId,
        buyerName: request.buyerName,
        propertyCount: request.propertyAddresses?.length || 1
      });

      // Check if user has credits
      const canPerform = await this.checkUserCredits(userId);
      if (!canPerform.hasCredits) {
        return {
          success: false,
          error: 'Insufficient credits',
          creditUsed: 'free',
          remainingCredits: canPerform.credits
        };
      }

      // Prepare property addresses for lookup
      const propertyAddresses = this.preparePropertyAddresses(request);
      
      // Check cache first
      const cachedResult = await this.checkCache(request.buyerName, propertyAddresses[0]);
      if (cachedResult) {
        logger.info('Found cached skip trace result', { buyerName: request.buyerName });
        
        // Record user access without consuming credits
        await this.recordUserAccess(userId, parseInt(cachedResult.lookupId), request, 'cached', 0);
        
        return {
          success: true,
          lookupId: cachedResult.lookupId.toString(),
          result: cachedResult,
          creditUsed: 'cached',
          remainingCredits: canPerform.credits
        };
      }

      // Consume credit before making API calls
      const creditResult = await this.consumeCredit(userId);
      if (!creditResult.success) {
        return {
          success: false,
          error: creditResult.error || 'Failed to consume credit',
          creditUsed: 'free',
          remainingCredits: canPerform.credits
        };
      }

      // Perform adaptive property lookup
      const contactInfo = await this.adaptivePropertyLookup(request.buyerName, propertyAddresses);
      
      // Create skip trace result
      const skipTraceResult = this.buildSkipTraceResult(request, contactInfo, creditResult.creditType);
      
      // Add phone verification data to new result
      try {
        const phoneNumbers = skipTraceResult.phones.map(p => p.number);
        const verificationData = await this.getPhoneVerificationData(phoneNumbers, request.buyerName);
        skipTraceResult.phones = this.addVerificationToPhones(skipTraceResult.phones, verificationData);
      } catch (verificationError) {
        logger.warn('Failed to add verification data to new result (V1)', { 
          error: verificationError 
        });
      }
      
      // Cache the result
      const lookupId = await this.cacheResult(skipTraceResult, contactInfo);
      skipTraceResult.lookupId = lookupId.toString();

      // Record user access
      await this.recordUserAccess(userId, lookupId, request, creditResult.creditType, 1);

      logger.info('Skip trace completed successfully', {
        userId,
        buyerId: request.buyerId,
        lookupId,
        emailsFound: contactInfo.emails.length,
        phonesFound: contactInfo.phoneNumbers.length,
        creditUsed: creditResult.creditType
      });

      return {
        success: true,
        lookupId: lookupId.toString(),
        result: skipTraceResult,
        creditUsed: creditResult.creditType,
        remainingCredits: {
          free: creditResult.remainingFree,
          paid: creditResult.remainingPaid
        }
      };

    } catch (error: any) {
      logger.error('Skip trace failed', { 
        userId, 
        buyerId: request.buyerId, 
        error: error.message,
        stack: error.stack 
      });

      return {
        success: false,
        error: error.message || 'Skip trace lookup failed',
        creditUsed: 'free',
        remainingCredits: { free: 0, paid: 0 }
      };
    }
  }

  /**
   * Adaptive property lookup strategy - start with 1, expand to max 3
   */
  private async adaptivePropertyLookup(buyerName: string, propertyAddresses: string[]): Promise<ContactInfo> {
    let allContactInfo: ContactInfo = {
      emails: [],
      phoneNumbers: [],
      matchedOwners: []
    };

    if (propertyAddresses.length === 0) {
      throw new AppError('No property addresses provided for skip trace lookup', 400);
    }

    // Pre-validate addresses to see if any are complete
    const validAddresses = propertyAddresses.filter(address => {
      return leadSherpaClient.parseAddress(address) !== null;
    });

    if (validAddresses.length === 0) {
      logger.warn('All provided addresses are incomplete - missing city/state or zipcode', {
        totalAddresses: propertyAddresses.length,
        sampleAddresses: propertyAddresses.slice(0, 3)
      });
      throw new AppError(
        'No valid addresses found. Addresses must include city and state, or zipcode for skip tracing.',
        400
      );
    }

    logger.info('Skip trace address validation', {
      totalAddresses: propertyAddresses.length,
      validAddresses: validAddresses.length,
      skippedCount: propertyAddresses.length - validAddresses.length
    });

    const maxProperties = Math.min(3, propertyAddresses.length);
    // const maxProperties = Math.min(1, propertyAddresses.length); // TESTING: Use only 1 property (was 3 for production)
    
    for (let i = 0; i < maxProperties; i++) {
      const address = propertyAddresses[i];
      logger.info(`Looking up property ${i + 1}/${maxProperties}`, { address, buyerName });

      try {
        // Parse address and make API call
        const propertyLookup = leadSherpaClient.parseAddress(address);
        
        // Skip if address is incomplete
        if (!propertyLookup) {
          logger.info(`Skipping incomplete address ${i + 1}/${maxProperties}`, { 
            address, 
            reason: 'Missing required city/state or zipcode for Lead Sherpa API' 
          });
          continue;
        }
        
        // Debug: Log the parsed property lookup
        logger.debug('Skip Trace - Calling Lead Sherpa API', {
          originalAddress: address,
          parsedLookup: JSON.stringify(propertyLookup, null, 2),
          buyerName: buyerName,
          propertyIndex: i + 1,
          maxProperties: maxProperties
        });
        
        const response = await leadSherpaClient.lookupPropertyOwners([propertyLookup]);
        
        // Debug: Log the API response summary
        logger.debug('Skip Trace - Lead Sherpa API Response Summary', {
          statusCode: response.status,
          propertiesReturned: response.data.property_results?.length || 0,
          hasPropertyResults: !!response.data.property_results,
          buyerName: buyerName
        });
        
        // Find matching owners
        const contactInfo = ownerMatchingService.findMatchingOwners(buyerName, response.data.property_results);
        
        // Merge contact info
        allContactInfo = this.mergeContactInfo(allContactInfo, contactInfo);
        
        // If we found good matches and have enough contact info, stop early
        if (this.hasGoodMatch(contactInfo) && this.hasSufficientContactInfo(allContactInfo)) {
          logger.info(`Found sufficient contact info after ${i + 1} properties`, {
            emailsFound: allContactInfo.emails.length,
            phonesFound: allContactInfo.phoneNumbers.length
          });
          break;
        }

      } catch (error: any) {
        logger.warn(`Failed to lookup property ${i + 1}`, { 
          address, 
          error: error.message 
        });
        
        // Continue with next property unless it's the last one
        if (i === maxProperties - 1) {
          // If this is the last property and we still have no contact info, 
          // check if all failures were 404 (property not found)
          if (allContactInfo.emails.length === 0 && allContactInfo.phoneNumbers.length === 0) {
            // This is likely a case where none of the properties exist in Lead Sherpa database
            // Return empty results instead of throwing error
            logger.info('All properties returned 404 - no properties found in skip trace database', {
              buyerName,
              totalPropertiesChecked: i + 1,
              lastError: error.message
            });
            return allContactInfo; // Return empty contact info
          } else {
            throw error;
          }
        }
      }
    }

    return allContactInfo;
  }

  /**
   * Check if we found a good match
   */
  private hasGoodMatch(contactInfo: ContactInfo): boolean {
    // High confidence matches (company name or exact name matches)
    const hasHighConfidenceMatch = contactInfo.matchedOwners.some(owner => 
      owner.confidence > 0.8 && (owner.matchType === 'exact' || owner.matchType === 'company_name')
    );
    
    // Fallback match with contact info
    const hasFallbackWithContacts = contactInfo.matchedOwners.some(owner => 
      owner.matchType === 'fallback' && (contactInfo.emails.length > 0 || contactInfo.phoneNumbers.length > 0)
    );
    
    return hasHighConfidenceMatch || hasFallbackWithContacts;
  }

  /**
   * Check if we have sufficient contact information
   */
  private hasSufficientContactInfo(contactInfo: ContactInfo): boolean {
    return contactInfo.emails.length >= 2 && contactInfo.phoneNumbers.length >= 2;
  }

  /**
   * Merge contact information from multiple lookups
   */
  private mergeContactInfo(existing: ContactInfo, newInfo: ContactInfo): ContactInfo {
    const emailSet = new Set([...existing.emails, ...newInfo.emails]);
    const phoneSet = new Set([...existing.phoneNumbers, ...newInfo.phoneNumbers]);
    
    return {
      emails: Array.from(emailSet).slice(0, 3), // Max 3 emails
      phoneNumbers: Array.from(phoneSet), // No limit on phones
      matchedOwners: [...existing.matchedOwners, ...newInfo.matchedOwners]
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10) // Keep top 10 matches
    };
  }

  /**
   * Prepare property addresses for lookup - ONLY use purchase history properties
   */
  private preparePropertyAddresses(request: SkipTraceRequest): string[] {
    const addresses: string[] = [];
    
    // Only use addresses from property purchase history (NOT business addresses)
    if (request.propertyAddresses && request.propertyAddresses.length > 0) {
      addresses.push(...request.propertyAddresses);
    }
    
    if (addresses.length === 0) {
      throw new AppError('No property purchase history provided for skip trace lookup', 400);
    }
    
    // Remove duplicates and limit to 3 (should already be limited by frontend)
    const uniqueAddresses = [...new Set(addresses)];
    return uniqueAddresses.slice(0, 3);
    // return uniqueAddresses.slice(0, 1); // TESTING: Use only 1 property (was 3 for production)
  }

  /**
   * Check user's available credits
   */
  private async checkUserCredits(userId: number): Promise<{ hasCredits: boolean; credits: { free: number; paid: number } }> {
    try {
      // Direct query for credit balance
      const result = await query(`
        SELECT 
          free_credits_remaining as free_credits,
          paid_credits_remaining as paid_credits,
          (free_credits_remaining + paid_credits_remaining) as total_credits
        FROM skip_trace_credits 
        WHERE user_id = $1
      `, [userId]);

      const credits = result.rows[0] || { free_credits: 0, paid_credits: 0, total_credits: 0 };
      const totalCredits = credits.total_credits || 0;

      logger.debug('Checked user credits', { 
        userId, 
        freeCredits: credits.free_credits,
        paidCredits: credits.paid_credits,
        totalCredits,
        hasCredits: totalCredits > 0
      });

      return {
        hasCredits: totalCredits > 0,
        credits: {
          free: credits.free_credits || 0,
          paid: credits.paid_credits || 0
        }
      };
    } catch (error: any) {
      logger.error('Error checking user credits', { userId, error: error.message });
      return {
        hasCredits: false,
        credits: { free: 0, paid: 0 }
      };
    }
  }

  /**
   * Consume a credit for the user
   */
  private async consumeCredit(userId: number): Promise<{
    success: boolean;
    creditType: 'free' | 'paid';
    remainingFree: number;
    remainingPaid: number;
    error?: string;
  }> {
    try {
      // Get current credits
      const creditCheck = await query(`
        SELECT 
          free_credits_remaining,
          paid_credits_remaining
        FROM skip_trace_credits 
        WHERE user_id = $1
      `, [userId]);

      if (creditCheck.rows.length === 0) {
        return {
          success: false,
          creditType: 'free',
          remainingFree: 0,
          remainingPaid: 0,
          error: 'No credit record found for user'
        };
      }

      const currentCredits = creditCheck.rows[0];
      const freeCredits = currentCredits.free_credits_remaining || 0;
      const paidCredits = currentCredits.paid_credits_remaining || 0;

      if (freeCredits + paidCredits <= 0) {
        return {
          success: false,
          creditType: 'free',
          remainingFree: freeCredits,
          remainingPaid: paidCredits,
          error: 'Insufficient credits'
        };
      }

      // Consume free credits first, then paid credits
      let creditType: 'free' | 'paid';
      let updateQuery: string;

      if (freeCredits > 0) {
        creditType = 'free';
        updateQuery = `
          UPDATE skip_trace_credits
          SET 
            free_credits_remaining = free_credits_remaining - 1,
            total_free_credits_used = total_free_credits_used + 1,
            total_lookups_performed = total_lookups_performed + 1,
            updated_at = NOW()
          WHERE user_id = $1
          RETURNING free_credits_remaining, paid_credits_remaining
        `;
      } else {
        creditType = 'paid';
        updateQuery = `
          UPDATE skip_trace_credits
          SET 
            paid_credits_remaining = paid_credits_remaining - 1,
            total_paid_credits_used = total_paid_credits_used + 1,
            total_lookups_performed = total_lookups_performed + 1,
            updated_at = NOW()
          WHERE user_id = $1
          RETURNING free_credits_remaining, paid_credits_remaining
        `;
      }

      const updateResult = await query(updateQuery, [userId]);
      const updatedCredits = updateResult.rows[0];

      logger.debug('Credit consumed successfully', {
        userId,
        creditType,
        remainingFree: updatedCredits.free_credits_remaining,
        remainingPaid: updatedCredits.paid_credits_remaining
      });

      return {
        success: true,
        creditType,
        remainingFree: updatedCredits.free_credits_remaining,
        remainingPaid: updatedCredits.paid_credits_remaining
      };
    } catch (error: any) {
      logger.error('Error consuming credit', { userId, error: error.message });
      return {
        success: false,
        creditType: 'free',
        remainingFree: 0,
        remainingPaid: 0,
        error: 'Failed to consume credit'
      };
    }
  }

  /**
   * Check cache for existing results
   */
  private async checkCache(buyerName: string, primaryAddress: string): Promise<SkipTraceResult | null> {
    try {
      const normalizedAddress = this.normalizeAddress(primaryAddress);
      const normalizedName = this.normalizeName(buyerName);

      const result = await query(`
        SELECT 
          lookup_id,
          found_phone_numbers,
          found_email_addresses,
          owner_names,
          raw_api_response,
          api_response_status,
          dnc_status,
          litigator_status,
          first_lookup_date,
          data_freshness_days
        FROM skip_trace_results
        WHERE input_address_normalized = $1 
        AND COALESCE(input_owner_name_normalized, '') = $2
        AND data_freshness_days < 90
        AND api_response_status = 'success'
        ORDER BY last_updated DESC
        LIMIT 1
      `, [normalizedAddress, normalizedName]);

      if (result.rows.length === 0) {
        return null;
      }

      const cached = result.rows[0];
      
      // Convert cached result to SkipTraceResult format
      const cachedResult = {
        lookupId: cached.lookup_id.toString(),
        buyerId: '', // Will be filled by caller
        buyerName: buyerName,
        lookupDate: cached.first_lookup_date,
        creditUsed: 'cached' as const,
        phones: this.parsePhoneNumbers(cached.found_phone_numbers),
        emails: this.parseEmails(cached.found_email_addresses),
        addresses: [], // Addresses will be populated from buyer data in frontend
        compliance: {
          dncStatus: cached.dnc_status ? 'On DNC List' : 'Not on DNC List',
          litigatorStatus: cached.litigator_status ? 'Known Litigator' : 'Not a Known Litigator'
        },
        apiResponseStatus: cached.api_response_status,
        matchedOwners: this.parseMatchedOwnersFromRawResponseV1(cached.raw_api_response)
      };
      
      // Add phone verification data to cached result
      try {
        const phoneNumbers = cachedResult.phones.map(p => p.number);
        const verificationData = await this.getPhoneVerificationData(phoneNumbers, buyerName);
        cachedResult.phones = this.addVerificationToPhones(cachedResult.phones, verificationData);
      } catch (verificationError) {
        logger.warn('Failed to add verification data to cached result (V1)', { 
          error: verificationError 
        });
      }
      
      return cachedResult;

    } catch (error: any) {
      logger.error('Error checking cache', { buyerName, primaryAddress, error: error.message });
      return null;
    }
  }

  /**
   * Cache the skip trace result
   */
  private async cacheResult(result: SkipTraceResult, contactInfo: ContactInfo): Promise<number> {
    try {
      // Store only owner names in the owner_names column (keep it lean)
      const ownerNamesArray = contactInfo.matchedOwners?.map(owner => 
        owner.owner?.name || 
        (owner.owner?.person_name?.first_name + ' ' + owner.owner?.person_name?.last_name).trim() || 
        'Unknown Owner'
      ).filter(name => name) || [];
      
      const normalizedAddress = result.addresses?.[0]?.address || '';
      const normalizedName = this.normalizeName(result.buyerName);
      try {
        const insertResult = await query(`
          INSERT INTO skip_trace_results (
            input_address_normalized,
            input_owner_name_normalized,
            api_response_status,
            found_phone_numbers,
            found_email_addresses,
            owner_names,
            phone_count,
            email_count,
            dnc_status,
            litigator_status,
            raw_api_response
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING lookup_id
        `, [
          normalizedAddress,
          normalizedName,
          result.apiResponseStatus,
          JSON.stringify(result.phones),
          JSON.stringify(result.emails),
          JSON.stringify(ownerNamesArray), // Store only names array
          result.phones.length,
          result.emails.length,
          this.hasDncStatus(contactInfo),
          this.hasLitigatorStatus(contactInfo),
          JSON.stringify(contactInfo.matchedOwners)
        ]);
        return insertResult.rows[0].lookup_id;
      } catch (error: any) {
        // Handle duplicate key error (unique constraint violation)
        if (error.code === '23505') {
          // Fetch the existing row's lookup_id
          const existing = await query(
            `SELECT lookup_id FROM skip_trace_results WHERE input_address_normalized = $1 AND COALESCE(input_owner_name_normalized, '') = $2 LIMIT 1`,
            [normalizedAddress, normalizedName]
          );
          if (existing.rows.length > 0) {
            return existing.rows[0].lookup_id;
          }
        }
        logger.error('Error caching result', { error: error.message });
        throw new AppError('Failed to cache skip trace result', 500);
      }
    } catch (error: any) {
      logger.error('Error caching result', { error: error.message });
      throw new AppError('Failed to cache skip trace result', 500);
    }
  }

  /**
   * Record user access to skip trace result
   */
  private async recordUserAccess(
    userId: number, 
    lookupId: number, 
    request: SkipTraceRequest, 
    creditType: 'free' | 'paid' | 'cached',
    creditCost: number
  ): Promise<void> {
    try {
      await query(`
        INSERT INTO skip_trace_user_access (
          user_id,
          lookup_id,
          buyer_id,
          buyer_name,
          original_search_address,
          credit_type,
          access_source,
          credit_cost,
          was_cached
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        userId,
        lookupId,
        request.buyerId,
        request.buyerName,
        request.inputData.address || '',
        creditType,
        'new_lookup',
        creditCost,
        creditType === 'cached'
      ]);
    } catch (error: any) {
      logger.error('Error recording user access', { 
        userId, 
        lookupId, 
        error: error.message 
      });
      // Don't throw - this is not critical
    }
  }

  /**
   * Build skip trace result from contact info
   */
  private buildSkipTraceResult(request: SkipTraceRequest, contactInfo: ContactInfo, creditType: 'free' | 'paid'): SkipTraceResult {
    return {
      lookupId: '', // Will be set after caching
      buyerId: request.buyerId,
      buyerName: request.buyerName,
      lookupDate: new Date().toISOString(),
      creditUsed: creditType,
      phones: contactInfo.phoneNumbers.map(phone => ({
        number: phone,
        type: 'Unknown',
        confidence: 'Medium' as const
      })),
      emails: contactInfo.emails.map(email => ({
        email,
        type: 'Unknown',
        confidence: 'Medium' as const
      })),
      addresses: contactInfo.matchedOwners.map(owner => ({
        address: owner.propertyAddress,
        type: 'Property',
        confidence: 'Medium' as const
      })),
      compliance: {
        dncStatus: this.hasDncStatus(contactInfo) ? 'On DNC List' : 'Not on DNC List',
        litigatorStatus: this.hasLitigatorStatus(contactInfo) ? 'Known Litigator' : 'Not a Known Litigator'
      },
      apiResponseStatus: contactInfo.emails.length > 0 || contactInfo.phoneNumbers.length > 0 ? 'success' : 'no_data',
      matchedOwners: contactInfo.matchedOwners
    };
  }

  // Helper methods
  /**
   * Get phone verification data for phone numbers
   */
  private async getPhoneVerificationData(phoneNumbers: string[], buyerName: string): Promise<any[]> {
    try {
      if (phoneNumbers.length === 0) {
        return [];
      }

      // Clean phone numbers before database lookup
      const cleanedPhoneNumbers = phoneNumbers.map(phone => phone.replace(/\D/g, ''));
      
      const verificationResult = await query(`
        SELECT * FROM get_phone_verification_stats($1, $2)
      `, [buyerName, cleanedPhoneNumbers]);
      
      return verificationResult.rows;
    } catch (error: any) {
      logger.warn('Failed to get phone verification data (V1)', { 
        buyerName, 
        phoneCount: phoneNumbers.length,
        error: error.message 
      });
      return [];
    }
  }

  /**
   * Add verification data to phone numbers
   */
  private addVerificationToPhones(
    phones: Array<{ number: string; type: string; confidence: 'High' | 'Medium' | 'Low' }>, 
    verificationData: any[]
  ): Array<{ number: string; type: string; confidence: 'High' | 'Medium' | 'Low'; verification?: any }> {
    return phones.map(phone => {
      const cleanedPhoneNumber = phone.number.replace(/\D/g, '');
      const verification = verificationData.find(v => v.phone_number === cleanedPhoneNumber);
      
      return {
        ...phone,
        verification: verification ? {
          verifiedCount: verification.verified_count,
          invalidCount: verification.invalid_count,
          netScore: verification.net_verification_score,
          status: verification.verification_status
        } : {
          verifiedCount: 0,
          invalidCount: 0,
          netScore: 0,
          status: 'unverified'
        }
      };
    });
  }

  private normalizeAddress(address: string): string {
    return address.toLowerCase().trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
  }

  private normalizeName(name: string): string {
    return name.toLowerCase().trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
  }

  private parsePhoneNumbers(phonesJson: any): Array<{ number: string; type: string; confidence: 'High' | 'Medium' | 'Low' }> {
    try {
      return Array.isArray(phonesJson) ? phonesJson : [];
    } catch {
      return [];
    }
  }

  private parseEmails(emailsJson: any): Array<{ email: string; type: string; confidence: 'High' | 'Medium' | 'Low' }> {
    try {
      return Array.isArray(emailsJson) ? emailsJson : [];
    } catch {
      return [];
    }
  }

  private hasDncStatus(contactInfo: ContactInfo): boolean {
    return contactInfo.matchedOwners.some(owner =>
      owner.owner.phone_numbers.some(phone =>
        phone.dnc_statuses.some(status => status.is_dnc)
      )
    );
  }

  private hasLitigatorStatus(contactInfo: ContactInfo): boolean {
    return contactInfo.matchedOwners.some(owner =>
      owner.owner.phone_numbers.some(phone =>
        phone.dnc_statuses.some(status => status.is_litigator)
      )
    );
  }

  /**
   * Parse matched owners from raw API response for V1 service
   */
  private parseMatchedOwnersFromRawResponseV1(rawApiResponse: any): MatchedOwner[] {
    try {
      if (typeof rawApiResponse === 'string') {
        rawApiResponse = JSON.parse(rawApiResponse);
      }
      
      // V1 stores raw LeadSherpa response format or MatchedOwner array directly
      if (Array.isArray(rawApiResponse)) {
        // If it's already a MatchedOwner array, return it
        return rawApiResponse.slice(0, 5);
      }
      
      // Fallback: try to get from owner_names if raw response is not available
      return [];
    } catch (error: any) {
      logger.warn('Failed to parse matched owners from raw API response (V1)', { 
        error: error.message 
      });
      return [];
    }
  }

  /**
   * Parse owner names from database JSONB field for v1 service
   */
  private parseOwnerNamesV1(ownerNamesJson: any): MatchedOwner[] {
    try {
      if (typeof ownerNamesJson === 'string') {
        ownerNamesJson = JSON.parse(ownerNamesJson);
      }
      if (Array.isArray(ownerNamesJson)) {
        return ownerNamesJson.map((owner, index) => {
          // Handle backward compatibility: if owner is just a string (old format)
          if (typeof owner === 'string') {
            return {
              owner: {
                object_id: `cached_legacy_owner_${index}`,
                person_name: {
                  title: '',
                  first_name: '',
                  middle_name: '',
                  last_name: owner,
                  suffix: ''
                },
                age: 0,
                deceased: false,
                date_of_birth_month_year: '',
                relation_type: 'cached',
                name: owner,
                addresses: [],
                emails: [],
                phone_numbers: []
              },
              confidence: 0.8,
              matchType: 'fallback',
              propertyAddress: 'Cached Result'
            };
          }
          
          // Handle new format: owner is an object (StandardizedOwner format)
          if (owner && typeof owner === 'object' && owner.name) {
            return {
              owner: {
                object_id: owner.id || `cached_owner_${index}`,
                person_name: {
                  title: '',
                  first_name: owner.name.split(' ')[0] || '',
                  middle_name: '',
                  last_name: owner.name.split(' ').slice(1).join(' ') || '',
                  suffix: ''
                },
                age: owner.age || 0,
                deceased: owner.deceased || false,
                date_of_birth_month_year: '',
                relation_type: owner.relationshipType || 'cached',
                name: owner.name,
                addresses: owner.addresses || [],
                emails: owner.emails || [],
                phone_numbers: owner.phoneNumbers || []
              },
              confidence: owner.matchConfidence || 0.8,
              matchType: owner.matchType || 'fallback',
              propertyAddress: 'Cached Result'
            };
          }
          
          // Fallback for unexpected formats
          return {
            owner: {
              object_id: `cached_unknown_owner_${index}`,
              person_name: {
                title: '',
                first_name: '',
                middle_name: '',
                last_name: 'Unknown Owner',
                suffix: ''
              },
              age: 0,
              deceased: false,
              date_of_birth_month_year: '',
              relation_type: 'cached',
              name: 'Unknown Owner',
              addresses: [],
              emails: [],
              phone_numbers: []
            },
            confidence: 0.5,
            matchType: 'fallback',
            propertyAddress: 'Cached Result'
          };
        });
      }
      return [];
    } catch (error: any) {
      logger.warn('Failed to parse owner names from database (V1)', { 
        error: error.message, 
        ownerNamesJson: JSON.stringify(ownerNamesJson) 
      });
      return [];
    }
  }
}

export default new SkipTraceService(); 