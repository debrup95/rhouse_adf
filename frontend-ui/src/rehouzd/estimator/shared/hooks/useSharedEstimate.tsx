import { useState, useEffect, useCallback } from 'react';
import {
  SharedEstimateData,
  SharedEstimateError,
  UpdateSharedCalculationRequest,
  UpdateSharedCalculationResponse,
  GetSharedEstimateResponse,
} from '../types/sharedEstimateTypes';
import config from '../../../../config';

interface UseSharedEstimateReturn {
  sharedEstimate: SharedEstimateData | null;
  isLoading: boolean;
  error: SharedEstimateError | null;
  updateCalculation?: (request: UpdateSharedCalculationRequest) => Promise<void>;
  isUpdating: boolean;
  refetch: () => Promise<void>;
}

export const useSharedEstimate = (shareToken?: string): UseSharedEstimateReturn => {
  const [sharedEstimate, setSharedEstimate] = useState<SharedEstimateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<SharedEstimateError | null>(null);

  // Fetch shared estimate data
  const fetchSharedEstimate = useCallback(async () => {
    if (!shareToken) {
      setError({
        code: 'INVALID_TOKEN',
        message: 'No share token provided',
      });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${config.apiUrl}/api/shared-estimates/${shareToken}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('NOT_FOUND');
        } else if (response.status === 410) {
          throw new Error('EXPIRED');
        } else if (response.status === 403) {
          throw new Error('INACTIVE');
        } else {
          throw new Error('SERVER_ERROR');
        }
      }

      const data: GetSharedEstimateResponse = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to load estimate');
      }

      setSharedEstimate(data.data);
    } catch (error: any) {
      console.error('Error fetching shared estimate:', error);
      
      const errorCode = error.message || 'SERVER_ERROR';
      const errorMessages: Record<string, string> = {
        NOT_FOUND: 'This shared estimate could not be found.',
        EXPIRED: 'This shared estimate has expired.',
        INACTIVE: 'This shared estimate is no longer active.',
        INVALID_TOKEN: 'The shared estimate link is invalid.',
        SERVER_ERROR: 'An error occurred while loading the estimate.',
      };

      setError({
        code: errorCode as any,
        message: errorMessages[errorCode] || errorMessages.SERVER_ERROR,
        details: error,
      });
    } finally {
      setIsLoading(false);
    }
  }, [shareToken]);

  // Update calculation with new values
  const updateCalculation = useCallback(async (request: UpdateSharedCalculationRequest) => {
    if (!shareToken || !sharedEstimate) {
      throw new Error('No share token or estimate data available');
    }

    try {
      setIsUpdating(true);

      const response = await fetch(`${config.apiUrl}/api/shared-estimates/${shareToken}/calculate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: UpdateSharedCalculationResponse = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to update calculation');
      }

      // Update the local state with new calculation results
      setSharedEstimate(prev => {
        if (!prev) return prev;

        return {
          ...prev,
          estimateData: {
            ...prev.estimateData,
            buyerEstimatedPrice: data.data!.buyerEstimatedPrice,
            // Update underwrite values with new values
            underwriteValues: {
              ...prev.estimateData.underwriteValues,
              ...Object.entries(request.underwriteValues).reduce((acc, [key, value]) => ({
                ...acc,
                [key]: {
                  ...(prev.estimateData.underwriteValues as any)[key],
                  value,
                },
              }), {}),
            },
            // Update comparables if filters were applied
            ...(data.data!.filteredComparables && {
              comparableProperties: data.data!.filteredComparables,
            }),
          },
        };
      });
    } catch (error: any) {
      console.error('Error updating calculation:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [shareToken, sharedEstimate]);

  // Refetch data
  const refetch = useCallback(async () => {
    await fetchSharedEstimate();
  }, [fetchSharedEstimate]);

  // Initial fetch
  useEffect(() => {
    fetchSharedEstimate();
  }, [shareToken]); // Only depend on shareToken, not the function itself

  return {
    sharedEstimate,
    isLoading,
    error,
    updateCalculation: undefined, // Disabled for shared estimates to prevent API calls
    isUpdating: false, // Always false since we don't make API calls
    refetch,
  };
};