import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GRAPHQL_ENDPOINT, STORAGE_KEYS } from '../utils/constants';

// Create HTTP link
const httpLink = createHttpLink({
  uri: GRAPHQL_ENDPOINT,
});

// Create auth link to attach token to requests
const authLink = setContext(async (_, { headers }) => {
  // Get the authentication token from async storage
  const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

  // Return the headers to the context
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

// Create Apollo Client
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          events: {
            merge(existing = [], incoming) {
              return incoming;
            },
          },
          myRegistrations: {
            merge(existing = [], incoming) {
              return incoming;
            },
          },
          myTransactions: {
            merge(existing = [], incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

export default client;
