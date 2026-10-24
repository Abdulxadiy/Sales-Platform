/* eslint-disable no-undef */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../src/navigation/useAppNavigation', () => ({
  useAppNavigation: () => ({ openDrawer: jest.fn(), navigate: jest.fn(), goBack: jest.fn() }),
  getReceiptSnapshot: () => null,
}));

jest.mock('expo-crypto', () => ({ randomUUID: () => require('node:crypto').randomUUID() }));

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
