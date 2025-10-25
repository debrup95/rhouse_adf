import { query } from '../../config/db';
import logger from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';
import { getSkipTraceProviderFactory } from './skipTraceProviderFactory';
import {
  SkipTraceRequest as ProviderSkipTraceRequest,
  SkipTraceResponse as ProviderSkipTraceResponse,
  SkipTraceAddress,
  StandardizedOwner,
} from '../../interfaces/skipTraceProviders';

// Keep existing interfaces for backward compatibility
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
  matchedOwners?: StandardizedOwner[];
  sourceProvider?: string;
}

export interface SkipTraceResponse {
  success: boolean;
  lookupId?: string;
  result?: SkipTraceResult;
  error?: string;
  creditUsed: 'free' | 'paid' | 'cached';
  remainingCredits: { free: number; paid: number } | number;
}

class SkipTraceServiceV2 {
  private providerFactory = getSkipTraceProviderFactory();

  /**
   * Perform skip trace lookup with provider abstraction and fallback
   */
  async performSkipTrace(userId: string | number, request: SkipTraceRequest): Promise<SkipTraceResponse> {
    const userIdNum = typeof userId === 'string' ? parseInt(userId) : userId;
    
    try {
      
      logger.info('Starting skip trace process (V2)', {
        userId: userIdNum,
        buyerId: request.buyerId,
        buyerName: request.buyerName,
        propertyCount: request.propertyAddresses?.length || 1,
        version: 'v2'
      });

      // Debug provider selection
      const providerFactory = getSkipTraceProviderFactory();
      logger.debug('🔍 Provider Configuration Debug', {
        primaryProvider: process.env.SKIP_TRACE_PRIMARY_PROVIDER || 'batchdata',
        fallbackProvider: process.env.SKIP_TRACE_FALLBACK_PROVIDER,
        enableFallback: process.env.SKIP_TRACE_ENABLE_FALLBACK,
        batchDataApiKey: process.env.BATCH_DATA_API_KEY ? '***CONFIGURED***' : 'NOT_SET',
        leadSherpaApiKey: process.env.LEAD_SHERPA_API_KEY ? '***CONFIGURED***' : 'NOT_SET'
      });

      // Check if user has credits
      const canPerform = await this.checkUserCredits(userIdNum);
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
      
      // Check cache - USER-SPECIFIC ACCESS CONTROL
      const normalizedAddress = this.normalizeAddress(propertyAddresses[0]);
      
      // First, check if THIS USER has already skip traced this contact
      const userCachedResult = await this.getUserCachedResult(userIdNum, normalizedAddress, request.buyerName);
      if (userCachedResult) {
        logger.info('🎯 Returning user-specific cached skip trace result (no credit charge)', {
          userId: userIdNum,
          lookupId: userCachedResult.lookupId,
          buyerName: request.buyerName,
          provider: 'skipTraceServiceV2'
        });
        
        // Add phone verification data to cached result
        try {
          const phoneNumbers = userCachedResult.phones.map(p => p.number);
          const verificationData = await this.getPhoneVerificationData(phoneNumbers, request.buyerName);
          userCachedResult.phones = this.addVerificationToPhones(userCachedResult.phones, verificationData);
        } catch (verificationError) {
          logger.warn('Failed to add verification data to cached result', { 
            error: verificationError 
          });
        }
        
        return {
          success: true,
          lookupId: userCachedResult.lookupId.toString(),
          result: userCachedResult,
          creditUsed: 'cached',
          remainingCredits: canPerform.credits
        };
      }
      
      // Check if ANY user has skip traced this (for data reuse, but still charge credit)
      const globalCachedResult = await this.getGlobalCachedResult(normalizedAddress, request.buyerName);
      if (globalCachedResult) {
        logger.info('Reusing global cached data for new user', {
          userId: userIdNum,
          originalLookupId: globalCachedResult.lookup_id,
          buyerName: request.buyerName
        });
        
        try {
          // First, prepare the response to ensure we can deliver the service
          const cachedResponse = this.convertCachedToResponse(globalCachedResult, request, 'free'); // Use 'free' temporarily
          
          // Add phone verification data to cached result
          try {
            const phoneNumbers = cachedResponse.phones.map(p => p.number);
            const verificationData = await this.getPhoneVerificationData(phoneNumbers, request.buyerName);
            cachedResponse.phones = this.addVerificationToPhones(cachedResponse.phones, verificationData);
          } catch (verificationError) {
            logger.warn('Failed to add verification data to reused cached result', { 
              error: verificationError 
            });
          }
          
          // Now consume credit ONLY after we know we can deliver the service
          const creditResult = await this.consumeCredit(userIdNum);
          if (!creditResult.success) {
            logger.error('Failed to consume credit for cached data reuse', {
              userId: userIdNum,
              buyerId: request.buyerId,
              error: creditResult.error
            });
            return {
              success: false,
              error: creditResult.error || 'Failed to consume credit',
              creditUsed: 'free',
              remainingCredits: canPerform.credits
            };
          }
          
          // Update the response with the actual credit type used
          cachedResponse.creditUsed = creditResult.creditType;
          
          // Grant access to this user (after successful credit consumption)
          await this.recordUserAccess(userIdNum, globalCachedResult.lookup_id, request, creditResult.creditType, 1);
          
          logger.info('Skip trace completed using cached data (V2)', {
            userId: userIdNum,
            buyerId: request.buyerId,
            lookupId: globalCachedResult.lookup_id,
            emailsFound: cachedResponse.emails.length,
            phonesFound: cachedResponse.phones.length,
            creditUsed: creditResult.creditType,
            provider: 'cached_data',
            usedFallback: false,
            version: 'v2'
          });
          
          return {
            success: true,
            lookupId: globalCachedResult.lookup_id.toString(),
            result: cachedResponse,
            creditUsed: creditResult.creditType,
            remainingCredits: {
              free: creditResult.remainingFree,
              paid: creditResult.remainingPaid
            }
          };
          
        } catch (error: any) {
          logger.error('Failed to process cached data for new user', {
            userId: userIdNum,
            buyerId: request.buyerId,
            lookupId: globalCachedResult.lookup_id,
            error: error.message
          });
          
          // Return error without consuming credits since we couldn't deliver the service
          return {
            success: false,
            error: `Failed to process cached data: ${error.message}`,
            creditUsed: 'free',
            remainingCredits: canPerform.credits
          };
        }
      }

      // Convert to provider format
      const providerRequest = this.convertToProviderRequest(request, propertyAddresses);
      
      // Attempt with primary provider
      let providerResponse: ProviderSkipTraceResponse;
      let usedFallback = false;

      try {
        const primaryProvider = this.providerFactory.getPrimaryProvider();
        
        logger.debug('🚀 Provider Selection Debug', {
          primaryProviderName: primaryProvider.constructor.name,
          canValidateConfig: primaryProvider.validateConfig(),
          factoryConfigured: !!this.providerFactory
        });
        
        logger.info('Attempting skip trace with primary provider', {
          provider: primaryProvider.constructor.name,
          userId: userIdNum,
          buyerId: request.buyerId,
          buyerName: request.buyerName
        });

        providerResponse = await primaryProvider.performSkipTrace(providerRequest);
        
        // Validate primary provider response
        if (!providerResponse) {
          throw new Error('Primary provider returned null response');
        }
        
        // Check if we got meaningful results
        if (providerResponse.successful === 0 && providerResponse.failed > 0) {
          throw new Error('Primary provider returned no successful results');
        }

      } catch (primaryError: any) {
        logger.warn('Primary provider failed, attempting fallback', {
          primaryError: primaryError.message,
          userId: userIdNum,
          buyerId: request.buyerId
        });

        // Try fallback provider
        const fallbackProvider = this.providerFactory.getFallbackProvider();
        if (fallbackProvider) {
          try {
            logger.info('Attempting skip trace with fallback provider', {
              provider: fallbackProvider.constructor.name,
              userId: userIdNum,
              buyerId: request.buyerId
            });

            providerResponse = await fallbackProvider.performSkipTrace(providerRequest);
            usedFallback = true;

            // Validate fallback response
            if (!providerResponse || providerResponse.successful === 0) {
              throw new Error('Fallback provider returned no successful results');
            }

          } catch (fallbackError: any) {
            logger.error('Both primary and fallback providers failed', {
              primaryError: primaryError.message,
              fallbackError: fallbackError.message,
              userId: userIdNum,
              buyerId: request.buyerId
            });
            throw new AppError(`Skip trace providers unavailable: ${primaryError.message}`, 503);
          }
        } else {
          logger.error('No fallback provider configured', {
            primaryError: primaryError.message,
            userId: userIdNum,
            buyerId: request.buyerId
          });
          throw new AppError(`Skip trace service unavailable: ${primaryError.message}`, 503);
        }
      }

      // Convert provider response to existing format (without credit type yet)
      const skipTraceResult = this.convertFromProviderResponse(
        providerResponse,
        request,
        'free', // Temporary, will be updated after credit consumption
        usedFallback
      );
      
      // Add phone verification data to new result
      try {
        const phoneNumbers = skipTraceResult.phones.map(p => p.number);
        const verificationData = await this.getPhoneVerificationData(phoneNumbers, request.buyerName);
        skipTraceResult.phones = this.addVerificationToPhones(skipTraceResult.phones, verificationData);
      } catch (verificationError) {
        logger.warn('Failed to add verification data to new result', { 
          error: verificationError 
        });
      }
      
      // Cache the result
      const lookupId = await this.cacheResult(skipTraceResult, providerResponse, normalizedAddress);
      skipTraceResult.lookupId = lookupId.toString();

      // Now consume credit ONLY after successful service delivery (API + caching)
      const creditResult = await this.consumeCredit(userIdNum);
      if (!creditResult.success) {
        logger.error('Failed to consume credit after successful service delivery', {
          userId: userIdNum,
          buyerId: request.buyerId,
          lookupId,
          error: creditResult.error
        });
        return {
          success: false,
          error: creditResult.error || 'Failed to consume credit',
          creditUsed: 'free',
          remainingCredits: canPerform.credits
        };
      }

      // Update result with actual credit type used
      skipTraceResult.creditUsed = creditResult.creditType;

      // Record user access with actual credit information (non-critical - shouldn't fail the operation)
      try {
        await this.recordUserAccess(userIdNum, lookupId, request, creditResult.creditType, 1);
      } catch (accessError: any) {
        logger.warn('Failed to record user access (non-critical)', {
          userId: userIdNum,
          buyerId: request.buyerId,
          lookupId,
          error: accessError.message
        });
        // Don't fail the operation for this
      }

      logger.info('Skip trace completed successfully (V2)', {
        userId: userIdNum,
        buyerId: request.buyerId,
        lookupId,
        emailsFound: skipTraceResult.emails.length,
        phonesFound: skipTraceResult.phones.length,
        creditUsed: creditResult.creditType,
        provider: providerResponse.provider,
        usedFallback,
        version: 'v2'
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
      logger.error('Skip trace failed (V2)', { 
        userId: userIdNum, 
        buyerId: request.buyerId, 
        error: error.message,
        stack: error.stack,
        version: 'v2'
      });

      // Get current credits for proper error response
      const currentCredits = await this.checkUserCredits(userIdNum);

      // Determine error type and provide appropriate message
      let errorMessage: string;
      if (error instanceof AppError) {
        // These are our controlled errors (like database issues)
        errorMessage = error.message;
      } else if (error.message?.includes('database') || error.message?.includes('SQL')) {
        errorMessage = 'Database service temporarily unavailable. Please try again in a moment.';
      } else if (error.message?.includes('provider') || error.message?.includes('API')) {
        errorMessage = 'Skip trace service temporarily unavailable. Please try again later.';
      } else {
        errorMessage = 'Skip trace lookup failed. Please try again or contact support if the issue persists.';
      }

      return {
        success: false,
        error: errorMessage,
        creditUsed: 'free',
        remainingCredits: currentCredits.credits
      };
    }
  }

  /**
   * Convert legacy request format to provider request format
   */
  private convertToProviderRequest(
    request: SkipTraceRequest,
    propertyAddresses: string[]
  ): ProviderSkipTraceRequest {
    const addresses: SkipTraceAddress[] = propertyAddresses.map(address => {
      return this.parseAddressString(address);
    });

    return {
      addresses,
      buyerName: request.buyerName,
      options: {
        includeBusinesses: true,
        includeDNC: true,
        includeLitigators: true,
        maxResults: 10,
      }
    };
  }

  /**
   * Parse address string into structured format
   */
  private parseAddressString(address: string): SkipTraceAddress {
    if (!address || address.trim().length === 0) {
      throw new Error('Empty address provided');
    }

    // Enhanced address parsing
    const parts = address.split(',').map(p => p.trim());
    
    let street = '';
    let city = '';
    let state = '';
    let zipCode = '';

    if (parts.length >= 1) {
      street = parts[0];
    }
    if (parts.length >= 2) {
      city = parts[1];
    }
    if (parts.length >= 3) {
      const stateZip = parts[2].split(' ').filter(p => p.length > 0);
      if (stateZip.length >= 1) {
        state = stateZip[0];
      }
      if (stateZip.length >= 2) {
        zipCode = stateZip[1];
      }
    }

    // Try to extract state and zip from the end if no commas
    if (parts.length === 1 && street) {
      const addressParts = street.split(' ');
      const possibleZip = addressParts[addressParts.length - 1];
      const possibleState = addressParts[addressParts.length - 2];
      
      if (/^\d{5}(-\d{4})?$/.test(possibleZip)) {
        zipCode = possibleZip;
        street = addressParts.slice(0, -1).join(' ');
        
        if (possibleState && /^[A-Z]{2}$/i.test(possibleState)) {
          state = possibleState.toUpperCase();
          street = addressParts.slice(0, -2).join(' ');
          
          const remainingParts = addressParts.slice(0, -2);
          if (remainingParts.length > 2) {
            const streetPattern = /^\d+[A-Z]?\s/i;
            if (streetPattern.test(street)) {
              const streetWords = street.split(' ');
              if (streetWords.length > 2) {
                street = streetWords.slice(0, 2).join(' ');
                city = streetWords.slice(2).join(' ');
              }
            }
          }
        }
      }
    }

    return {
      street: street || '',
      city: city || undefined,
      state: state || undefined,
      zipCode: zipCode || undefined,
    };
  }

  /**
   * Convert provider response to legacy format
   */
  private convertFromProviderResponse(
    providerResponse: ProviderSkipTraceResponse,
    originalRequest: SkipTraceRequest,
    creditType: 'free' | 'paid',
    usedFallback: boolean
  ): SkipTraceResult {
    // Aggregate all contact info from all successful results
    const allPhones: string[] = [];
    const allEmails: string[] = [];
    const allAddresses: string[] = [];
    const allOwners: StandardizedOwner[] = [];
    let hasSuccessfulResults = false;

    logger.debug('🔍 Converting provider response to legacy format', {
      provider: providerResponse.provider,
      resultCount: providerResponse.results.length,
      buyerName: originalRequest.buyerName
    });

    for (const result of providerResponse.results) {
      if (result.success && result.owners.length > 0) {
        hasSuccessfulResults = true;
        
        logger.debug('📋 Processing successful property result', {
          propertyAddress: result.propertyAddress,
          ownersCount: result.owners.length,
          buyerName: originalRequest.buyerName
        });
        
        for (const owner of result.owners) {
          // Extract ALL contact info from property owners, regardless of name matching
          // Since we're searching by property address, any contact info found is relevant
          allOwners.push(owner);
          
          // Add contact info
          owner.phoneNumbers.forEach(phone => {
            if (!allPhones.includes(phone.number)) {
              allPhones.push(phone.number);
            }
          });
          
          owner.emails.forEach(email => {
            if (!allEmails.includes(email.email)) {
              allEmails.push(email.email);
            }
          });
          
          owner.addresses.forEach(addr => {
            if (!allAddresses.includes(addr.address)) {
              allAddresses.push(addr.address);
            }
          });

          logger.debug('📞 Contact info extracted from owner', {
            ownerName: owner.name,
            ownerType: owner.type,
            matchConfidence: owner.matchConfidence,
            phoneCount: owner.phoneNumbers.length,
            emailCount: owner.emails.length,
            phones: owner.phoneNumbers.map(p => p.number),
            emails: owner.emails.map(e => e.email),
            buyerName: originalRequest.buyerName
          });
        }
      }
    }

    // Sort owners by confidence
    allOwners.sort((a, b) => b.matchConfidence - a.matchConfidence);

    logger.info('📞 Final contact info aggregation', {
      totalOwners: allOwners.length,
      totalPhones: allPhones.length,
      totalEmails: allEmails.length,
      phones: allPhones,
      emails: allEmails,
      buyerName: originalRequest.buyerName,
      provider: providerResponse.provider
    });

    // Convert to legacy format
    return {
      lookupId: '', // Will be set after caching
      buyerId: originalRequest.buyerId,
      buyerName: originalRequest.buyerName,
      lookupDate: new Date().toISOString(),
      creditUsed: creditType,
      phones: allPhones.slice(0, 10).map(phone => ({
        number: this.formatPhoneNumber(phone),
        type: 'Unknown',
        confidence: 'Medium' as const
      })),
      emails: allEmails.slice(0, 5).map(email => ({
        email: email.toLowerCase().trim(),
        type: 'Unknown',
        confidence: 'Medium' as const
      })),
      addresses: allAddresses.slice(0, 5).map(address => ({
        address,
        type: 'Property',
        confidence: 'Medium' as const
      })),
      compliance: {
        dncStatus: this.hasDncStatus(allOwners) ? 'On DNC List' : 'Not on DNC List',
        litigatorStatus: this.hasLitigatorStatus(allOwners) ? 'Known Litigator' : 'Not a Known Litigator'
      },
      apiResponseStatus: hasSuccessfulResults ? 'success' : 'no_data',
      matchedOwners: allOwners.slice(0, 5),
      sourceProvider: `${providerResponse.provider}${usedFallback ? ' (fallback)' : ''}`
    };
  }

  private formatPhoneNumber(phone: string): string {
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

  private isOwnerMatch(buyerName: string, owner: StandardizedOwner): boolean {
    // Use match confidence from provider or basic name matching
    if (owner.matchConfidence > 0.3) {
      return true;
    }
    
    // Fallback to simple name matching
    const normalizedBuyer = this.normalizeName(buyerName);
    const normalizedOwner = this.normalizeName(owner.name);
    
    return normalizedOwner.includes(normalizedBuyer) || normalizedBuyer.includes(normalizedOwner);
  }

  private normalizeName(name: string): string {
    return name.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  }

  private hasDncStatus(owners: StandardizedOwner[]): boolean {
    return owners.some(owner => 
      owner.phoneNumbers.some(phone => phone.isDNC)
    );
  }

  private hasLitigatorStatus(owners: StandardizedOwner[]): boolean {
    return owners.some(owner => 
      owner.phoneNumbers.some(phone => phone.isLitigator)
    );
  }

  // Keep all existing methods for backward compatibility
  
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
    return uniqueAddresses.slice(0, 3); // TESTING: Use only 1 property (was 3 for production)
  }

  /**
   * Check if user has credits
   */
  private async checkUserCredits(userId: number): Promise<{ hasCredits: boolean; credits: any }> {
    try {
      const result = await query(`
        SELECT 
          COALESCE(free_credits_remaining, 3) as free_credits,
          COALESCE(paid_credits_remaining, 0) as paid_credits
        FROM skip_trace_credits 
        WHERE user_id = $1
      `, [userId]);

      let freeCredits = 3;
      let paidCredits = 0;

      if (result.rows.length > 0) {
        freeCredits = result.rows[0].free_credits;
        paidCredits = result.rows[0].paid_credits;
      }

      const totalCredits = freeCredits + paidCredits;
      
      return {
        hasCredits: totalCredits > 0,
        credits: {
          free: freeCredits,
          paid: paidCredits,
          total: totalCredits
        }
      };
    } catch (error: any) {
      logger.error('Error checking user credits', { userId, error: error.message });
      return { hasCredits: false, credits: { free: 0, paid: 0, total: 0 } };
    }
  }

  /**
   * Consume a credit for the user (using direct SQL like original service)
   */
  private async consumeCredit(userId: number): Promise<{
    success: boolean;
    creditType: 'free' | 'paid';
    remainingFree: number;
    remainingPaid: number;
    error?: string;
  }> {
    try {
      // Get current credits first
      const creditsResult = await query(`
        SELECT free_credits_remaining, paid_credits_remaining
        FROM skip_trace_credits
        WHERE user_id = $1
      `, [userId]);

      if (creditsResult.rows.length === 0) {
        return {
          success: false,
          creditType: 'free',
          remainingFree: 0,
          remainingPaid: 0,
          error: 'No credit record found'
        };
      }

      const { free_credits_remaining: freeCredits, paid_credits_remaining: paidCredits } = creditsResult.rows[0];

      // Determine credit type and update query
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
      } else if (paidCredits > 0) {
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
      } else {
        return {
          success: false,
          creditType: 'free',
          remainingFree: 0,
          remainingPaid: 0,
          error: 'No credits available'
        };
      }

      const updateResult = await query(updateQuery, [userId]);
      const updatedCredits = updateResult.rows[0];

      logger.debug('Credit consumed successfully (V2)', {
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
   * Rollback a credit consumption (compensating transaction)
   */
  private async rollbackCredit(userId: number, creditType: 'free' | 'paid'): Promise<boolean> {
    try {
      let updateQuery: string;

      if (creditType === 'free') {
        updateQuery = `
          UPDATE skip_trace_credits
          SET 
            free_credits_remaining = free_credits_remaining + 1,
            total_free_credits_used = GREATEST(total_free_credits_used - 1, 0),
            total_lookups_performed = GREATEST(total_lookups_performed - 1, 0),
            updated_at = NOW()
          WHERE user_id = $1
        `;
      } else {
        updateQuery = `
          UPDATE skip_trace_credits
          SET 
            paid_credits_remaining = paid_credits_remaining + 1,
            total_paid_credits_used = GREATEST(total_paid_credits_used - 1, 0),
            total_lookups_performed = GREATEST(total_lookups_performed - 1, 0),
            updated_at = NOW()
          WHERE user_id = $1
        `;
      }

      await query(updateQuery, [userId]);

      logger.info('Credit rollback successful', {
        userId,
        creditType,
        reason: 'service_delivery_failed'
      });

      return true;
    } catch (error: any) {
      logger.error('Credit rollback failed', { 
        userId, 
        creditType, 
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Check if a specific user has already skip traced this contact
   */
  private async getUserCachedResult(userId: number, normalizedAddress: string, buyerName: string): Promise<SkipTraceResult | null> {
    try {
      const normalizedName = this.normalizeName(buyerName);

      logger.info('🔍 Cache lookup debug', {
        userId,
        originalAddress: normalizedAddress,
        normalizedAddress,
        originalBuyerName: buyerName,
        normalizedName,
        provider: 'skipTraceServiceV2'
      });

      const result = await query(`
        SELECT sr.*, sua.created_at as user_access_date
        FROM skip_trace_results sr
        INNER JOIN skip_trace_user_access sua ON sr.lookup_id = sua.lookup_id
        WHERE sua.user_id = $1 
          AND sr.input_address_normalized = $2 
          AND COALESCE(sr.input_owner_name_normalized, '') = $3
          AND sr.api_response_status = 'success'
          AND sr.data_freshness_days < 90
        ORDER BY sua.created_at DESC
        LIMIT 1
      `, [userId, normalizedAddress, normalizedName]);

      logger.info('🔍 Cache lookup result', {
        userId,
        normalizedAddress,
        normalizedName,
        recordsFound: result.rows.length,
        provider: 'skipTraceServiceV2'
      });

      if (result.rows.length === 0) {
        // Additional debug: Check if there are any records for this user
        const userRecords = await query(`
          SELECT sr.lookup_id, sr.input_address_normalized, sr.input_owner_name_normalized, sua.buyer_name
          FROM skip_trace_results sr
          INNER JOIN skip_trace_user_access sua ON sr.lookup_id = sua.lookup_id
          WHERE sua.user_id = $1 
          ORDER BY sua.created_at DESC
          LIMIT 5
        `, [userId]);

        logger.info('🔍 User has these skip trace records', {
          userId,
          totalRecords: userRecords.rows.length,
          records: userRecords.rows.map(r => ({
            lookupId: r.lookup_id,
            storedAddress: r.input_address_normalized,
            storedName: r.input_owner_name_normalized,
            buyerName: r.buyer_name
          })),
          searchingFor: {
            normalizedAddress,
            normalizedName
          }
        });

        return null;
      }

      const cached = result.rows[0];
      
      logger.info('✅ Found cached skip trace result', { 
        userId,
        lookupId: cached.lookup_id,
        buyerName,
        provider: 'skipTraceServiceV2'
      });
      
      // Convert cached result to SkipTraceResult format
      return {
        lookupId: cached.lookup_id.toString(),
        buyerId: '', // Will be filled by caller
        buyerName: buyerName,
        lookupDate: cached.first_lookup_date,
        creditUsed: 'cached',
        phones: this.parsePhoneNumbers(cached.found_phone_numbers),
        emails: this.parseEmails(cached.found_email_addresses),
        addresses: [], // Addresses will be populated from buyer data in frontend
        compliance: {
          dncStatus: cached.dnc_status ? 'On DNC List' : 'Not on DNC List',
          litigatorStatus: cached.litigator_status ? 'Known Litigator' : 'Not a Known Litigator'
        },
        apiResponseStatus: cached.api_response_status,
        matchedOwners: this.parseMatchedOwnersFromRawResponse(cached.raw_api_response) // Parse from raw response
      };

    } catch (error: any) {
      logger.error('Critical database error in getUserCachedResult', { 
        userId, 
        normalizedAddress, 
        buyerName, 
        error: error.message,
        stack: error.stack 
      });
      // Re-throw SQL errors instead of silently returning null
      throw new AppError(`Database error during cache lookup: ${error.message}`, 500);
    }
  }

  /**
   * Check if ANY user has skip traced this contact (for data reuse)
   */
  private async getGlobalCachedResult(normalizedAddress: string, buyerName: string): Promise<any | null> {
    try {
      const normalizedName = this.normalizeName(buyerName);

      const result = await query(`
        SELECT * FROM skip_trace_results 
        WHERE input_address_normalized = $1 
          AND COALESCE(input_owner_name_normalized, '') = $2
          AND api_response_status = 'success'
          AND data_freshness_days < 90
        ORDER BY last_updated DESC
        LIMIT 1
      `, [normalizedAddress, normalizedName]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];

    } catch (error: any) {
      logger.error('Critical database error in getGlobalCachedResult', { 
        normalizedAddress, 
        buyerName, 
        error: error.message,
        stack: error.stack 
      });
      // Re-throw SQL errors instead of silently returning null
      throw new AppError(`Database error during global cache lookup: ${error.message}`, 500);
    }
  }

  /**
   * Convert cached database result to SkipTraceResult format
   */
  private convertCachedToResponse(cached: any, request: SkipTraceRequest, creditType: 'free' | 'paid'): SkipTraceResult {
    const phones = this.parsePhoneNumbers(cached.found_phone_numbers);
    
    return {
      lookupId: cached.lookup_id.toString(),
      buyerId: request.buyerId,
      buyerName: request.buyerName,
      lookupDate: cached.first_lookup_date,
      creditUsed: creditType,
      phones, // Will be enhanced with verification data by caller
      emails: this.parseEmails(cached.found_email_addresses),
      addresses: [], // Addresses will be populated from buyer data in frontend
      compliance: {
        dncStatus: cached.dnc_status ? 'On DNC List' : 'Not on DNC List',
        litigatorStatus: cached.litigator_status ? 'Known Litigator' : 'Not a Known Litigator'
      },
      apiResponseStatus: cached.api_response_status,
      matchedOwners: this.parseMatchedOwnersFromRawResponse(cached.raw_api_response), // Parse from raw response
      sourceProvider: 'cached_data'
    };
  }

  /**
   * Check cache for existing results (DEPRECATED - kept for backward compatibility)
   */
//   private async checkCache(buyerName: string, primaryAddress: string): Promise<SkipTraceResult | null> {
//     try {
//       const normalizedAddress = this.normalizeAddress(primaryAddress);
//       const normalizedName = this.normalizeName(buyerName);

//       const result = await query(`
//         SELECT 
//           lookup_id,
//           found_phone_numbers,
//           found_email_addresses,
//           api_response_status,
//           dnc_status,
//           litigator_status,
//           first_lookup_date,
//           data_freshness_days
//         FROM skip_trace_results
//         WHERE input_address_normalized = $1 
//         AND COALESCE(input_owner_name_normalized, '') = $2
//         AND data_freshness_days < 90
//         AND api_response_status = 'success'
//         ORDER BY last_updated DESC
//         LIMIT 1
//       `, [normalizedAddress, normalizedName]);

//       if (result.rows.length === 0) {
//         return null;
//       }

//       const cached = result.rows[0];
      
//       // Convert cached result to SkipTraceResult format
//       return {
//         lookupId: cached.lookup_id.toString(),
//         buyerId: '', // Will be filled by caller
//         buyerName: buyerName,
//         lookupDate: cached.first_lookup_date,
//         creditUsed: 'cached',
//         phones: this.parsePhoneNumbers(cached.found_phone_numbers),
//         emails: this.parseEmails(cached.found_email_addresses),
//         addresses: [], // Addresses will be populated from buyer data in frontend
//         compliance: {
//           dncStatus: cached.dnc_status ? 'On DNC List' : 'Not on DNC List',
//           litigatorStatus: cached.litigator_status ? 'Known Litigator' : 'Not a Known Litigator'
//         },
//         apiResponseStatus: cached.api_response_status
//       };

//     } catch (error: any) {
//       logger.error('Error checking cache', { buyerName, primaryAddress, error: error.message });
//       return null;
//     }
//   }

  /**
   * Cache the skip trace result
   */
  private async cacheResult(
    result: SkipTraceResult,
    providerResponse: ProviderSkipTraceResponse,
    normalizedAddress: string
  ): Promise<number> {
    try {
      const phonesArray = Array.isArray(result.phones) ? result.phones : [];
      const emailsArray = Array.isArray(result.emails) ? result.emails : [];
      
      // Store only owner names in the owner_names column (keep it lean)
      const ownerNamesArray = (result.matchedOwners || []).map(owner => owner.name).filter(name => name);
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
          JSON.stringify(phonesArray),
          JSON.stringify(emailsArray),
          JSON.stringify(ownerNamesArray), // Store only names array
          phonesArray.length,
          emailsArray.length,
          this.hasDncStatus(result.matchedOwners || []),
          this.hasLitigatorStatus(result.matchedOwners || []),
          JSON.stringify(providerResponse)
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
   * Record user access to a lookup result
   */
  private async recordUserAccess(
    userId: number,
    lookupId: number,
    request: SkipTraceRequest,
    creditType: 'free' | 'paid' | 'cached',
    creditCost: number
  ): Promise<void> {
    try {
      // First check if user has already accessed this lookup
      const existingAccess = await query(`
        SELECT access_id, credit_cost, access_date 
        FROM skip_trace_user_access 
        WHERE user_id = $1 AND lookup_id = $2
        ORDER BY access_date DESC
        LIMIT 1
      `, [userId, lookupId]);

      if (existingAccess.rows.length > 0) {
        const existing = existingAccess.rows[0];
        logger.info('⚠️ User already accessed this lookup', {
          userId,
          lookupId,
          buyerName: request.buyerName,
          existingAccessId: existing.access_id,
          existingCreditCost: existing.credit_cost,
          existingAccessDate: existing.access_date,
          provider: 'skipTraceServiceV2'
        });

        // Don't charge again for cached access or create duplicate records
        if (creditType === 'cached' || existing.credit_cost > 0) {
          logger.info('🚫 Preventing duplicate charge for already accessed lookup', {
            userId,
            lookupId,
            buyerName: request.buyerName,
            originalCreditCost: existing.credit_cost,
            provider: 'skipTraceServiceV2'
          });
          return; // Exit without creating duplicate access record
        }
      }

      await query(`
        INSERT INTO skip_trace_user_access (
          user_id,
          lookup_id,
          buyer_id,
          buyer_name,
          original_search_address,
          original_search_owner,
          credit_type,
          access_source,
          credit_cost,
          was_cached,
          cache_age_hours
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        userId,
        lookupId,
        request.buyerId,
        request.buyerName,
        request.propertyAddresses?.[0] || '',
        request.buyerName,
        creditType,
        creditType === 'cached' ? 'cache_hit' : 'new_lookup',
        creditCost,
        creditType === 'cached',
        creditType === 'cached' ? 0 : null
      ]);

      logger.info('✅ Recorded user access', {
        userId,
        lookupId,
        buyerName: request.buyerName,
        creditType,
        creditCost,
        provider: 'skipTraceServiceV2'
      });

    } catch (error: any) {
      logger.error('Error recording user access', { 
        userId, 
        lookupId, 
        buyerName: request.buyerName,
        error: error.message 
      });
      // Don't throw here as this is not critical
    }
  }

  private normalizeAddress(address: string): string {
    return address.toLowerCase().trim().replace(/\s+/g, ' ');
  }

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
      
      logger.debug('🔍 Getting phone verification data', {
        buyerName,
        phoneNumbers,
        cleanedPhoneNumbers,
        provider: 'skipTraceServiceV2'
      });
      
      const verificationResult = await query(`
        SELECT * FROM get_phone_verification_stats($1, $2)
      `, [buyerName, cleanedPhoneNumbers]);
      
      logger.debug('📊 Phone verification stats result', {
        buyerName,
        cleanedPhoneNumbers,
        resultCount: verificationResult.rows.length,
        results: verificationResult.rows,
        provider: 'skipTraceServiceV2'
      });
      
      return verificationResult.rows;
    } catch (error: any) {
      logger.warn('Failed to get phone verification data', { 
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

  private parsePhoneNumbers(phonesJson: any): Array<{
    number: string;
    type: string;
    confidence: 'High' | 'Medium' | 'Low';
  }> {
    try {
      if (typeof phonesJson === 'string') {
        phonesJson = JSON.parse(phonesJson);
      }
      if (Array.isArray(phonesJson)) {
        return phonesJson.map(phone => ({
          number: phone.number || phone,
          type: phone.type || 'Unknown',
          confidence: (phone.confidence === 'High' || phone.confidence === 'Low') ? phone.confidence : 'Medium'
        }));
      }
      return [];
    } catch {
      return [];
    }
  }

  private parseEmails(emailsJson: any): Array<{
    email: string;
    type: string;
    confidence: 'High' | 'Medium' | 'Low';
  }> {
    try {
      if (typeof emailsJson === 'string') {
        emailsJson = JSON.parse(emailsJson);
      }
      if (Array.isArray(emailsJson)) {
        return emailsJson.map(email => ({
          email: email.email || email,
          type: email.type || 'Unknown',
          confidence: email.confidence || 'Medium'
        }));
      }
      return [];
    } catch {
      return [];
    }
  }

  private parseOwnerNames(ownerNamesJson: any): StandardizedOwner[] {
    try {
      if (typeof ownerNamesJson === 'string') {
        ownerNamesJson = JSON.parse(ownerNamesJson);
      }
      if (Array.isArray(ownerNamesJson)) {
        return ownerNamesJson.map((owner, index) => {
          // Handle backward compatibility: if owner is just a string (old format)
          if (typeof owner === 'string') {
            return {
              id: `legacy_owner_${index}`,
              name: owner,
              type: 'person' as const,
              age: undefined,
              deceased: false,
              relationshipType: undefined,
              matchConfidence: 0.5,
              matchType: 'fallback' as const,
              phoneNumbers: [],
              emails: [],
              addresses: []
            };
          }
          
          // Handle new format: owner is an object
          return {
            id: owner.id || `owner_${index}`,
            name: owner.name || 'Unknown Owner',
            type: (owner.type || 'person') as 'person' | 'business',
            age: owner.age,
            deceased: owner.deceased || false,
            relationshipType: owner.relationshipType,
            matchConfidence: owner.matchConfidence || 0.5,
            matchType: (owner.matchType || 'fallback') as 'exact' | 'fuzzy_name' | 'company_name' | 'fallback',
            phoneNumbers: owner.phoneNumbers || [],
            emails: owner.emails || [],
            addresses: owner.addresses || []
          };
        });
      }
      return [];
    } catch (error: any) {
      logger.warn('Failed to parse owner names from database', { 
        error: error.message, 
        ownerNamesJson: JSON.stringify(ownerNamesJson) 
      });
      return [];
    }
  }

  private parseMatchedOwnersFromRawResponse(rawApiResponse: any): StandardizedOwner[] {
    try {
      if (typeof rawApiResponse === 'string') {
        rawApiResponse = JSON.parse(rawApiResponse);
      }
      
      if (rawApiResponse && rawApiResponse.results && Array.isArray(rawApiResponse.results)) {
        const allOwners: StandardizedOwner[] = [];
        
        for (const result of rawApiResponse.results) {
          if (result.success && result.owners && Array.isArray(result.owners)) {
            allOwners.push(...result.owners);
          }
        }
        
        // Sort by confidence and return top 5
        return allOwners.sort((a, b) => b.matchConfidence - a.matchConfidence).slice(0, 5);
      }
      
      return [];
    } catch (error: any) {
      logger.warn('Failed to parse matched owners from raw API response', { 
        error: error.message 
      });
      return [];
    }
  }
}

export default new SkipTraceServiceV2(); 