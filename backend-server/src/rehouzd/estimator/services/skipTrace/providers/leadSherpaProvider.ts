import axios, { AxiosInstance, AxiosResponse } from 'axios';
import logger from '../../../utils/logger';
import { AppError } from '../../../middleware/errorHandler';
import {
  SkipTraceProvider,
  SkipTraceRequest,
  SkipTraceResponse,
  SkipTraceAddress,
  StandardizedOwner,
  StandardizedPhoneNumber,
  StandardizedEmail,
  StandardizedPropertyResult,
  ProviderConfig,
} from '../../../interfaces/skipTraceProviders';

// Lead Sherpa specific interfaces (keeping existing structure)
interface LeadSherpaPropertyLookup {
  property_address_lookup: {
    apn?: string | null;
    street?: string | null;
    street2?: string | null;
    city?: string | null;
    state?: string | null;
    zipcode?: string | null;
  };
  owner_entity_lookup?: any | null;
}

interface LeadSherpaRequest {
  property_lookups: LeadSherpaPropertyLookup[];
}

interface LeadSherpaResponse {
  property_results: Array<{
    status_code: number;
    issues: any[];
    property: {
      object_id: string;
      apn: string;
      address: {
        delivery_line1: string;
        delivery_line2: string | null;
        last_line: string;
        us_address: {
          street: string;
          city: string;
          state: string;
          zipcode: string;
        };
      };
      owners: Array<{
        person?: {
          object_id: string;
          person_name: {
            title: string;
            first_name: string;
            middle_name: string;
            last_name: string;
            suffix: string;
          };
          age: number;
          deceased: boolean;
          date_of_birth_month_year: string;
          relation_type: string | null;
          name: string;
          addresses: any[];
          emails: Array<{ email_address: string }>;
          phone_numbers: Array<{
            e164_format: string;
            local_format: string;
            country_code: string;
            country_calling_code: number;
            type: string;
            carrier: string;
            last_seen: string;
            dnc_statuses: Array<{
              is_dnc: boolean;
              is_litigator: boolean;
              date_status: string;
              is_registered: boolean;
              iso3166_geocode: string;
            }>;
          }>;
        };
        business?: {
          name: string;
          addresses: any[];
          emails: Array<{ email_address: string }>;
          phone_numbers: Array<{
            e164_format: string;
            local_format: string;
            country_code: string;
            country_calling_code: number;
            type: string;
            carrier: string;
            last_seen: string;
            dnc_statuses: Array<{
              is_dnc: boolean;
              is_litigator: boolean;
              date_status: string;
              is_registered: boolean;
              iso3166_geocode: string;
            }>;
          }>;
          associated_persons?: Array<{
            role: string;
            person: {
              object_id: string;
              person_name: {
                title: string;
                first_name: string;
                middle_name: string;
                last_name: string;
                suffix: string;
              };
              age: number;
              deceased: boolean;
              date_of_birth_month_year: string;
              relation_type: string | null;
              name: string;
              addresses: any[];
              emails: Array<{ email_address: string }>;
              phone_numbers: Array<{
                e164_format: string;
                local_format: string;
                country_code: string;
                country_calling_code: number;
                type: string;
                carrier: string;
                last_seen: string;
                dnc_statuses: Array<{
                  is_dnc: boolean;
                  is_litigator: boolean;
                  date_status: string;
                  is_registered: boolean;
                  iso3166_geocode: string;
                }>;
              }>;
            };
          }>;
        };
      }>;
    };
    source: number;
    lookup: LeadSherpaPropertyLookup;
  }>;
}

export class LeadSherpaProvider extends SkipTraceProvider {
  private client: AxiosInstance;

  constructor(config: ProviderConfig) {
    super(config);
    
    if (!config.apiKey) {
      throw new AppError('Lead Sherpa API key is required', 500);
    }

    this.client = axios.create({
      baseURL: config.baseUrl || 'https://skipsherpa.com',
      timeout: config.timeout || 30000,
      headers: {
        'API-Key': config.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Lead Sherpa API request successful', {
          url: response.config.url,
          method: response.config.method?.toUpperCase(),
          status: response.status,
          provider: 'leadsherpa',
        });
        return response;
      },
      (error) => {
        logger.error('Lead Sherpa API request failed', {
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
          responseData: error.response?.data,
          provider: 'leadsherpa',
        });
        return Promise.reject(error);
      }
    );
  }

  async performSkipTrace(request: SkipTraceRequest): Promise<SkipTraceResponse> {
    try {
      logger.info('Starting Lead Sherpa skip trace', {
        provider: 'leadsherpa',
        addressCount: request.addresses.length,
        buyerName: request.buyerName,
      });

      // Convert standardized addresses to Lead Sherpa format
      const leadSherpaLookups = this.convertToLeadSherpaFormat(request.addresses);
      
      if (leadSherpaLookups.length === 0) {
        throw new AppError('No valid addresses for Lead Sherpa lookup', 400);
      }

      const leadSherpaRequest: LeadSherpaRequest = {
        property_lookups: leadSherpaLookups
      };

      // Make API call to Lead Sherpa
      const response = await this.client.put<LeadSherpaResponse>(
        '/api/beta6/properties',
        leadSherpaRequest
      );

      // Convert Lead Sherpa response to standardized format
      const standardizedResponse = this.convertFromLeadSherpaFormat(
        response.data,
        request.buyerName
      );

      logger.info('Lead Sherpa skip trace completed', {
        provider: 'leadsherpa',
        totalResults: standardizedResponse.totalResults,
        successful: standardizedResponse.successful,
        failed: standardizedResponse.failed,
      });

      return standardizedResponse;

    } catch (error: any) {
      return this.handleError(error, request.addresses.length);
    }
  }

  validateConfig(): boolean {
    return !!(this.config.apiKey && this.config.baseUrl);
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple address lookup
      const testRequest: SkipTraceRequest = {
        addresses: [{
          street: '123 Test St',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210'
        }]
      };

      await this.performSkipTrace(testRequest);
      return true;
    } catch (error) {
      logger.error('Lead Sherpa connection test failed', { error });
      return false;
    }
  }

  private convertToLeadSherpaFormat(addresses: SkipTraceAddress[]): LeadSherpaPropertyLookup[] {
    const lookups: LeadSherpaPropertyLookup[] = [];

    for (const address of addresses) {
      const normalized = this.normalizeAddress(address);
      
      // Lead Sherpa requires either (city AND state) OR zipCode
      const hasLocationInfo = (normalized.city && normalized.state) || normalized.zipCode;
      
      if (!hasLocationInfo) {
        logger.debug('Skipping incomplete address for Lead Sherpa', {
          address: normalized,
          reason: 'Missing city/state or zipcode'
        });
        continue;
      }

      lookups.push({
        property_address_lookup: {
          apn: normalized.apn || null,
          street: normalized.street || null,
          street2: null,
          city: normalized.city || null,
          state: normalized.state || null,
          zipcode: normalized.zipCode || null,
        },
        owner_entity_lookup: null
      });
    }

    return lookups;
  }

  private convertFromLeadSherpaFormat(
    response: LeadSherpaResponse,
    buyerName?: string
  ): SkipTraceResponse {
    const results: StandardizedPropertyResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const propertyResult of response.property_results) {
      const propertyAddress = propertyResult.property?.address?.delivery_line1 || 'Unknown Address';
      
      if (propertyResult.status_code === 200 && propertyResult.property?.owners) {
        // Convert owners to standardized format
        const standardizedOwners = this.convertOwners(
          propertyResult.property.owners,
          buyerName,
          propertyAddress
        );

        results.push({
          propertyAddress,
          apn: propertyResult.property.apn,
          owners: standardizedOwners,
          statusCode: propertyResult.status_code,
          success: true,
          sourceProvider: 'leadsherpa'
        });
        successful++;
      } else {
        // Handle failed property lookup
        results.push({
          propertyAddress,
          apn: propertyResult.property?.apn,
          owners: [],
          statusCode: propertyResult.status_code,
          success: false,
          errors: propertyResult.issues?.map((issue: any) => issue.message || 'Unknown error'),
          sourceProvider: 'leadsherpa'
        });
        failed++;
      }
    }

    return {
      results,
      totalResults: results.length,
      successful,
      failed,
      provider: 'leadsherpa',
      isAsync: false
    };
  }

  private convertOwners(
    leadSherpaOwners: LeadSherpaResponse['property_results'][0]['property']['owners'],
    buyerName?: string,
    propertyAddress?: string
  ): StandardizedOwner[] {
    const owners: StandardizedOwner[] = [];

    for (const ownerGroup of leadSherpaOwners) {
      // Handle business entities
      if (ownerGroup.business) {
        const business = ownerGroup.business;
        const matchInfo = this.calculateBusinessMatch(buyerName, business.name);

        // Extract contact info from business and its associated persons
        const businessEmails = [...business.emails];
        const businessPhones = [...business.phone_numbers];
        const businessAddresses = [...business.addresses];

        // Add contact info from associated persons (e.g., registered agents, officers)
        if (business.associated_persons) {
          for (const associatedPerson of business.associated_persons) {
            if (associatedPerson.person) {
              businessEmails.push(...associatedPerson.person.emails);
              businessPhones.push(...associatedPerson.person.phone_numbers);
              businessAddresses.push(...associatedPerson.person.addresses);
            }
          }
        }

        logger.debug('🏢 LeadSherpa Business Entity Contact Extraction', {
          businessName: business.name,
          directEmails: business.emails.length,
          directPhones: business.phone_numbers.length,
          associatedPersons: business.associated_persons?.length || 0,
          totalEmailsExtracted: businessEmails.length,
          totalPhonesExtracted: businessPhones.length,
          buyerName
        });

        owners.push({
          id: `business_${business.name}`,
          name: business.name,
          type: 'business',
          matchConfidence: matchInfo.confidence,
          matchType: matchInfo.matchType,
          phoneNumbers: this.convertPhoneNumbers(businessPhones),
          emails: this.convertEmails(businessEmails),
          addresses: businessAddresses.map(addr => ({
            address: addr.toString(),
            type: 'Business',
          }))
        });
      }

      // Handle individual persons
      if (ownerGroup.person) {
        const person = ownerGroup.person;
        const matchInfo = this.calculatePersonMatch(buyerName, person.name);

        owners.push({
          id: person.object_id,
          name: person.name,
          type: 'person',
          age: person.age,
          deceased: person.deceased,
          relationshipType: person.relation_type || undefined,
          matchConfidence: matchInfo.confidence,
          matchType: matchInfo.matchType,
          phoneNumbers: this.convertPhoneNumbers(person.phone_numbers),
          emails: this.convertEmails(person.emails),
          addresses: person.addresses.map(addr => ({
            address: addr.toString(),
            type: 'Property',
          }))
        });
      }
    }

    // Sort by confidence (highest first)
    owners.sort((a, b) => b.matchConfidence - a.matchConfidence);

    return owners;
  }

  private convertPhoneNumbers(phones: any[]): StandardizedPhoneNumber[] {
    return phones.map(phone => ({
      number: phone.local_format,
      type: phone.type,
      carrier: phone.carrier,
      lastSeen: phone.last_seen,
      isDNC: phone.dnc_statuses?.some((status: any) => status.is_dnc) || false,
      isLitigator: phone.dnc_statuses?.some((status: any) => status.is_litigator) || false,
    }));
  }

  private convertEmails(emails: any[]): StandardizedEmail[] {
    return emails.map(email => ({
      email: email.email_address,
      type: 'Unknown',
    }));
  }

  private calculateBusinessMatch(buyerName?: string, businessName?: string): {
    confidence: number;
    matchType: 'exact' | 'fuzzy_name' | 'company_name' | 'fallback';
  } {
    if (!buyerName || !businessName) {
      return { confidence: 0.3, matchType: 'fallback' };
    }

    const normalizedBuyer = this.normalizeCompanyName(buyerName);
    const normalizedBusiness = this.normalizeCompanyName(businessName);

    if (normalizedBusiness.includes(normalizedBuyer) || normalizedBuyer.includes(normalizedBusiness)) {
      return { confidence: 0.9, matchType: 'company_name' };
    }

    // Check word overlap
    const buyerWords = normalizedBuyer.split(' ').filter(w => w.length > 2);
    const businessWords = normalizedBusiness.split(' ').filter(w => w.length > 2);

    if (buyerWords.length === 0 || businessWords.length === 0) {
      return { confidence: 0.3, matchType: 'fallback' };
    }

    const matchingWords = buyerWords.filter(word => 
      businessWords.some(compWord => compWord.includes(word) || word.includes(compWord))
    );

    const matchRatio = matchingWords.length / Math.min(buyerWords.length, businessWords.length);
    
    if (matchRatio >= 0.6) {
      return { confidence: 0.8, matchType: 'company_name' };
    }

    return { confidence: 0.3, matchType: 'fallback' };
  }

  private calculatePersonMatch(buyerName?: string, personName?: string): {
    confidence: number;
    matchType: 'exact' | 'fuzzy_name' | 'company_name' | 'fallback';
  } {
    if (!buyerName || !personName) {
      return { confidence: 0.3, matchType: 'fallback' };
    }

    const normalizedBuyer = this.normalizeName(buyerName);
    const normalizedPerson = this.normalizeName(personName);

    if (normalizedBuyer === normalizedPerson) {
      return { confidence: 1.0, matchType: 'exact' };
    }

    // Calculate name similarity
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
      .replace(/[^\w\s]/g, ' ')
      .replace(/\b(llc|inc|corp|company|co|ltd|investment|investments)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isPartialMatch(part1: string, part2: string): boolean {
    if (part1 === part2) return true;
    
    if ((part1.length === 1 && part2.startsWith(part1)) || 
        (part2.length === 1 && part1.startsWith(part2))) {
      return true;
    }

    if (part1.length >= 3 && part2.length >= 3) {
      return part1.startsWith(part2.substring(0, 3)) || 
             part2.startsWith(part1.substring(0, 3));
    }

    return false;
  }

  private handleError(error: any, addressCount: number): SkipTraceResponse {
    let errorMessage = 'Skip trace lookup failed';
    let statusCode = 500;

    if (error.response) {
      statusCode = error.response.status;
      
      switch (statusCode) {
        case 400:
          errorMessage = `Invalid request parameters: ${error.response.data?.message || error.message}`;
          break;
        case 401:
        case 403:
          errorMessage = 'Authentication failed - check API key';
          break;
        case 429:
          errorMessage = 'Rate limit exceeded';
          break;
        default:
          errorMessage = `API error: ${error.message}`;
      }
    }

    logger.error('Lead Sherpa skip trace failed', {
      provider: 'leadsherpa',
      error: errorMessage,
      statusCode,
      addressCount
    });

    return {
      results: [],
      totalResults: 0,
      successful: 0,
      failed: addressCount,
      provider: 'leadsherpa',
      isAsync: false
    };
  }
} 