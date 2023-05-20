export const errorResponse = {
  type: 'object',
  required: ['message'],
  properties: {
    message: {
      type: 'string',
    },
  },
};
