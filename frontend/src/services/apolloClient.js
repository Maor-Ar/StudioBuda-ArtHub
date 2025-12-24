import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GRAPHQL_ENDPOINT, STORAGE_KEYS } from '../utils/constants';

// HTTP Link
const httpLink = createHttpLink({
  uri: GRAPHQL_ENDPOINT,
});

// Auth Link - adds token to headers
const authLink = setContext(async (_, { headers }) => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      },
    };
  } catch (error) {
    console.error('Error getting auth token:', error);
    return { headers };
  }
});

// Create Apollo Client
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
    query: {
      fetchPolicy: 'network-only',
    },
  },
});

export default client;

