export const movieSchema = {
  type: 'object',
  required: ['id', 'title', 'year', 'rating'],
  properties: {
    id: {
      type: 'string',
      pattern:
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$',
      description: 'The movie ID (numeric characters only)',
    },
    title: {
      type: 'string',
      pattern: '^[a-zA-Z0-9 ]*$',
      minLength: 1,
      maxLength: 100,
      description: 'The movie title (alphanumeric characters and spaces only)',
    },
    year: {
      type: 'string',
      pattern: '^\\d{4}$',
      description: 'The release year of the movie',
    },
    rating: {
      type: 'string',
      enum: ['U', 'PG', '12', '15', '18'],
      pattern: '^[UPG]|1[258]$',
      description: 'The rating of the movie',
    },
  },
};
