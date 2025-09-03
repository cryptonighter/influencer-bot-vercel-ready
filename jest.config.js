export default {
  preset: null,
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js: '$1',
  },
  transform: {},
};