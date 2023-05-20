export const createMovieSchema = {
  type: 'object',
  required: ['title', 'year', 'rating'],
  properties: {
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
