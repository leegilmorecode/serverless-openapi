import { createMovieSchema } from './create-movie.schema';
import { schemaValidator } from '../../shared/utils/schema-validator';

describe('create-movie-schema', () => {
  it('should validate the create movie schema successfully', () => {
    const movie = {
      title: 'movie',
      year: '2012',
      rating: 'PG',
    };

    expect(() => schemaValidator(createMovieSchema, movie)).not.toThrow();
  });

  it('should not validate an invalid movie with an invalid year', () => {
    const movie = {
      title: 'new movie',
      rating: 'PG',
      year: 1,
    };

    expect(() =>
      schemaValidator(createMovieSchema, movie)
    ).toThrowErrorMatchingInlineSnapshot(
      `"[{"instancePath":"/year","schemaPath":"#/properties/year/type","keyword":"type","params":{"type":"string"},"message":"must be string"}]"`
    );
  });

  it('should not validate an invalid movie with an invalid title', () => {
    const movie = {
      title: '±',
      rating: 'PG',
      year: '2012',
    };

    expect(() =>
      schemaValidator(createMovieSchema, movie)
    ).toThrowErrorMatchingInlineSnapshot(
      `"[{"instancePath":"/title","schemaPath":"#/properties/title/pattern","keyword":"pattern","params":{"pattern":"^[a-zA-Z0-9 ]*$"},"message":"must match pattern \\"^[a-zA-Z0-9 ]*$\\""}]"`
    );
  });

  it('should not validate an invalid movie with an invalid rating', () => {
    const movie = {
      title: '±',
      rating: 'X',
      year: '2012',
    };

    expect(() =>
      schemaValidator(createMovieSchema, movie)
    ).toThrowErrorMatchingInlineSnapshot(
      `"[{"instancePath":"/title","schemaPath":"#/properties/title/pattern","keyword":"pattern","params":{"pattern":"^[a-zA-Z0-9 ]*$"},"message":"must match pattern \\"^[a-zA-Z0-9 ]*$\\""},{"instancePath":"/rating","schemaPath":"#/properties/rating/enum","keyword":"enum","params":{"allowedValues":["U","PG","12","15","18"]},"message":"must be equal to one of the allowed values"},{"instancePath":"/rating","schemaPath":"#/properties/rating/pattern","keyword":"pattern","params":{"pattern":"^[UPG]|1[258]$"},"message":"must match pattern \\"^[UPG]|1[258]$\\""}]"`
    );
  });
});
