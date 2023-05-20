import { errorResponse } from './error-response';
import { schemaValidator } from '../../../shared/utils/schema-validator';

describe('error-response-schema', () => {
  it('should validate the json schema successfully', () => {
    const error = {
      message: 'test-error',
    };

    expect(() => schemaValidator(errorResponse, error)).not.toThrow();
  });

  it('should not validate an invalid error response', () => {
    const error = {};

    expect(() =>
      schemaValidator(errorResponse, error)
    ).toThrowErrorMatchingInlineSnapshot(
      `"[{"instancePath":"","schemaPath":"#/required","keyword":"required","params":{"missingProperty":"message"},"message":"must have required property 'message'"}]"`
    );
  });
});
