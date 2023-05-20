import {
  APIGatewayClient,
  GetExportCommand,
  GetExportCommandOutput,
  GetExportRequest,
  GetStageCommand,
  GetStageCommandInput,
  GetStageCommandOutput,
} from '@aws-sdk/client-api-gateway';
import {
  CdkCustomResourceEvent,
  CdkCustomResourceHandler,
  CdkCustomResourceResponse,
} from 'aws-lambda';
import {
  GetObjectCommand,
  GetObjectCommandInput,
  GetObjectCommandOutput,
  PutObjectCommand,
  PutObjectCommandInput,
  PutObjectCommandOutput,
  S3Client,
} from '@aws-sdk/client-s3';

const apigwClient = new APIGatewayClient({});
const s3Client = new S3Client({});
const physicalResourceId = 'MovieOpenApiSpecJson';

// ensure that the deployment of the stage and restapi
// is complete before exporting the version of the openapi doc
async function ensureDeploymentCompleted(
  restApiId: string,
  deploymentId: string,
  stageName: string
): Promise<void> {
  let count = 0;
  const maxRetries = 10;
  const delayInSeconds = 10;

  const getStageParams: GetStageCommandInput = {
    restApiId: restApiId,
    stageName: stageName,
  };

  while (count < maxRetries) {
    const getStageCommand: GetStageCommand = new GetStageCommand(
      getStageParams
    );

    try {
      const response: GetStageCommandOutput = await apigwClient.send(
        getStageCommand
      );
      // get the associated deploymentId for the restApi and stage
      const associatedDeploymentId = response.deploymentId;

      if (associatedDeploymentId === deploymentId) {
        console.log(
          `Stage '${stageName}' is associated with the desired deployment ID of ${associatedDeploymentId}`
        );
        return; // Exit the function if the stage is associated with the desired deployment ID
      } else {
        console.log(
          `Stage '${stageName}' is not associated with the desired deployment ID of ${associatedDeploymentId}. Retrying in ${delayInSeconds} seconds...`
        );
        await delay(delayInSeconds * 1000); // Delay for the specified time in milliseconds
      }
    } catch (error) {
      console.error('Error retrieving stage details: ', error);
    }

    count++;
  }
}

// write the openapi spec to the specified s3 bucket and then check that
// it was successfully saved by retrieving it once written.
async function saveOpenApiSpecToBucket(
  bucket: string,
  fileBody: Uint8Array | undefined,
  fileName: string
): Promise<void> {
  if (!fileBody) throw new Error('no openapi spec body');

  let retryCount = 0;
  const delayInSeconds = 10;
  const maxRetries = 5;

  const input: PutObjectCommandInput = {
    Body: fileBody,
    ContentType: 'application/json',
    Bucket: bucket,
    Key: fileName,
  };

  const command = new PutObjectCommand(input);

  while (retryCount < maxRetries) {
    try {
      const response: PutObjectCommandOutput = await s3Client.send(command);

      console.log(
        `Writing to ${command.input.Bucket} for file ${command.input.Key}`
      );
      console.log(`S3 response: ${JSON.stringify(response)}`);

      // Check if the file is actually persisted by performing a getObject operation
      const getObjectInput: GetObjectCommandInput = {
        Bucket: bucket,
        Key: fileName,
      };
      const getObjectResponse: GetObjectCommandOutput = await s3Client.send(
        new GetObjectCommand(getObjectInput)
      );

      if (getObjectResponse.Body) {
        console.log(
          `File ${fileName} successfully persisted in the S3 bucket.`
        );
        break; // Exit the loop if the file is successfully written and retrieved
      } else {
        console.log(
          `File ${fileName} is not yet persisted in the S3 bucket. Retry attempt ${
            retryCount + 1
          } in 10 seconds...`
        );
      }
    } catch (error) {
      console.error(error);
      retryCount++;
      console.log(
        `Failed to write file. Retry attempt ${retryCount} in 10 seconds...`
      );
    }

    await delay(delayInSeconds * 1000); // Delay in milliseconds
  }

  if (retryCount === 10) {
    console.log(
      `File could not be written and persisted after ${maxRetries} attempts.`
    );
  }
}

// export the openapi spec document from the api gateway with backoff and retry
async function generateOpenApiSpec(
  restApiId: string,
  stageName: string
): Promise<GetExportCommandOutput> {
  let retryCount = 0;
  const maxRetries = 5;
  const delayInSeconds = 10;

  const getExportRequest: GetExportRequest = {
    restApiId,
    stageName,
    exportType: 'oas30',
    parameters: {},
    accepts: 'application/json',
  };
  const getExportCommand: GetExportCommand = new GetExportCommand(
    getExportRequest
  );

  while (retryCount < maxRetries) {
    try {
      const response: GetExportCommandOutput = await apigwClient.send(
        getExportCommand
      );
      console.log(`Request statuscode: ${response.$metadata.httpStatusCode}`);

      if (response.$metadata.httpStatusCode !== 200) {
        console.log(
          `Error response metadata: ${JSON.stringify(response.$metadata)}`
        );
        throw new Error('Unsuccessful attempt at downloading the schema');
      }
      return response;
    } catch (error) {
      console.error(`Retry ${retryCount + 1}: ${error}`);
      retryCount++;
      await delay(delayInSeconds * 1000); // Delay in milliseconds
    }
  }

  throw new Error(
    `Exceeded maximum retries (${maxRetries}) for getExportCommand.`
  );
}

async function delay(ms: number | undefined) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const handler: CdkCustomResourceHandler = async (
  event: CdkCustomResourceEvent
): Promise<CdkCustomResourceResponse> => {
  try {
    let response: CdkCustomResourceResponse;

    console.log(`event request: ${JSON.stringify(event)}`);

    const { ResourceProperties } = event;
    const { bucket, restApiId, stageName, version, deploymentId } =
      ResourceProperties;

    if (!bucket) throw new Error('bucket name not supplied');
    if (!restApiId) throw new Error('restApiId not supplied');
    if (!stageName) throw new Error('stageName not supplied');
    if (!version) throw new Error('version not supplied');
    if (!deploymentId) throw new Error('deploymentId not supplied');

    console.log(`api version ${version}`);

    switch (event.RequestType) {
      case 'Create':
        await ensureDeploymentCompleted(restApiId, deploymentId, stageName);
        // generate the open api spec
        const { body: createBody } = await generateOpenApiSpec(
          restApiId,
          stageName
        ); // save the open api spec to the s3 bucket
        await saveOpenApiSpecToBucket(
          bucket,
          createBody,
          'movies-openapi.json'
        );

        response = {
          Status: 'SUCCESS',
          Reason: '',
          LogicalResourceId: event.LogicalResourceId,
          PhysicalResourceId: physicalResourceId,
          RequestId: event.RequestId,
          StackId: event.StackId,
        };
        break;
      case 'Update':
        await ensureDeploymentCompleted(restApiId, deploymentId, stageName);
        // generate the open api spec
        const { body: updateBody } = await generateOpenApiSpec(
          restApiId,
          stageName
        ); // save the open api spec to the s3 bucket
        await saveOpenApiSpecToBucket(
          bucket,
          updateBody,
          'movies-openapi.json'
        );
        response = {
          Status: 'SUCCESS',
          Reason: '',
          LogicalResourceId: event.LogicalResourceId,
          PhysicalResourceId: physicalResourceId,
          RequestId: event.RequestId,
          StackId: event.StackId,
        };
        break;
      case 'Delete':
        // we do nothing as the bucket will be removed
        response = {
          Status: 'SUCCESS',
          Reason: '',
          LogicalResourceId: event.LogicalResourceId,
          PhysicalResourceId: physicalResourceId,
          RequestId: event.RequestId,
          StackId: event.StackId,
        };
        break;
      default:
        throw new Error(`event request type not found`);
    }

    console.log(`response: ${JSON.stringify(response)}`);

    return response;
  } catch (error) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) errorMessage = error.message;
    console.error(errorMessage);

    return {
      Status: 'FAILED',
      Reason: JSON.stringify(error),
      LogicalResourceId: event.LogicalResourceId,
      PhysicalResourceId: physicalResourceId,
      RequestId: event.RequestId,
      StackId: event.StackId,
    };
  }
};
