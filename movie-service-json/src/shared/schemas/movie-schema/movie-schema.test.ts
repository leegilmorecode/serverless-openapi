import { movieSchema } from './movie-schema';
import { schemaValidator } from '../../../shared/utils/schema-validator';

describe('movie-schema', () => {
  it('should validate the movie schema successfully', () => {
    const movie = {
      id: 'd135466b-4a0b-4c8b-9086-78a649b88850',
      title: 'new movie',
      year: '2012',
      rating: 'PG',
    };

    expect(() => schemaValidator(movieSchema, movie)).not.toThrow();
  });

  it('should not validate an invalid movie', () => {
    const movie = {
      title: 'new movie',
      rating: 'PG',
    };

    expect(() =>
      schemaValidator(movieSchema, movie)
    ).toThrowErrorMatchingInlineSnapshot(
      `"[{"instancePath":"","schemaPath":"#/required","keyword":"required","params":{"missingProperty":"id"},"message":"must have required property 'id'"},{"instancePath":"","schemaPath":"#/required","keyword":"required","params":{"missingProperty":"year"},"message":"must have required property 'year'"}]"`
    );
  });
});
