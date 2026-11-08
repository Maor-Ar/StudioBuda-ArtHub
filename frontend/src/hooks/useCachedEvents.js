import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_EVENTS } from '../services/graphql/queries';

// In-memory cache for events (non-persistent)
const eventsCache = new Map();

// Helper to create a consistent cache key from date range
const getCacheKey = (dateRange) => {
  if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
    return null;
  }
  // Normalize dates to YYYY-MM-DD format for consistent keys
  const start = new Date(dateRange.startDate).toISOString().split('T')[0];
  const end = new Date(dateRange.endDate).toISOString().split('T')[0];
  return `${start}_${end}`;
};

/**
 * Custom hook that caches events by date range
 * Returns cached data immediately if available, otherwise fetches from network
 */
export const useCachedEvents = (dateRange) => {
  const cacheKey = getCacheKey(dateRange);
  const [cachedData, setCachedData] = useState(() => {
    // Initialize with cached data if available
    if (cacheKey && eventsCache.has(cacheKey)) {
      return eventsCache.get(cacheKey);
    }
    return null;
  });

  // Check cache when cacheKey changes
  useEffect(() => {
    if (cacheKey && eventsCache.has(cacheKey)) {
      const cached = eventsCache.get(cacheKey);
      setCachedData(cached);
    } else {
      setCachedData(null);
    }
  }, [cacheKey]);

  // Use Apollo query - it will use its own cache, but we also maintain our cache
  const { data, loading, error, refetch: apolloRefetch } = useQuery(GET_EVENTS, {
    variables: {
      dateRange,
    },
    fetchPolicy: cachedData ? 'cache-first' : 'cache-and-network', // Use cache if available, otherwise fetch
    skip: !dateRange || !dateRange.startDate || !dateRange.endDate,
    onCompleted: (data) => {
      // Store in our custom cache when data is received
      if (cacheKey && data?.events) {
        const cacheEntry = {
          events: data.events,
          timestamp: Date.now(),
        };
        eventsCache.set(cacheKey, cacheEntry);
        setCachedData(cacheEntry);
      }
    },
  });

  // Return cached data immediately if available (instant display), otherwise return Apollo data
  // This gives us instant display when navigating back to a previously viewed week
  const eventsData = cachedData?.events || data?.events || null;
  const isLoading = !cachedData && loading;

  const refetch = async () => {
    if (cacheKey) {
      eventsCache.delete(cacheKey);
    }
    // refetch() always hits the network. Do not pass { fetchPolicy } — Apollo
    // treats that argument as query variables and can leave the UI on stale data.
    const result = await apolloRefetch();
    if (cacheKey && result?.data?.events) {
      const cacheEntry = {
        events: result.data.events,
        timestamp: Date.now(),
      };
      eventsCache.set(cacheKey, cacheEntry);
      setCachedData(cacheEntry);
    }
    return result;
  };

  return {
    data: eventsData ? { events: eventsData } : null,
    loading: isLoading,
    error,
    refetch,
  };
};

/**
 * Clear the events cache (useful after mutations)
 */
export const clearEventsCache = () => {
  eventsCache.clear();
};

/**
 * Clear cache for a specific date range
 * Note: This only clears the cache map, not the component state
 * Components should call refetch() after clearing to update their state
 */
export const clearEventsCacheForRange = (dateRange) => {
  const cacheKey = getCacheKey(dateRange);
  if (cacheKey) {
    eventsCache.delete(cacheKey);
  }
};

