import { sendUserAttributeVerificationCode, calculateA } from '@aws-amplify/auth/cognito';
import { SRPClient, calculateSignature, getNowString } from 'amazon-user-pool-srp-client'
import axios from 'axios'
import {  } from 'aws-amplify/auth'
function call(action, body) {
  const request = {
    url: 'https://cognito-idp.us-east-1.amazonaws.com',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': action
    },
    data: JSON.stringify(body),
    transformResponse: (data) => data
  }

  return axios(request)
    .then((result) => JSON.parse(result.data))
    .catch((error) => {
      const _err = JSON.parse(error.response.data)
      const err = new Error()
      err.code = _err.__type
      err.message = _err.message
      return Promise.reject(err)
    })
}

async function run() {
  const srp = new SRPClient('CognitoUserPool3-sa5tz6iUrKGQ')

  calculateA()
  const SRP_A = srp.calculateA()
  const initiateAuth = await call('AWSCognitoIdentityProviderService.InitiateAuth', {
    ClientId: '5elcou6997jqr17rfhp8dr1hae',
    AuthFlow: 'USER_SRP_AUTH',
    AuthParameters: {
      USERNAME: 'test@andmore.dev',
      SRP_A
    }
  });

  const { ChallengeName, ChallengeParameters, Session } = initiateAuth;

  const hkdf = srp.getPasswordAuthenticationKey(ChallengeParameters.USER_ID_FOR_SRP, 'Password123!', ChallengeParameters.SRP_B, ChallengeParameters.SALT)
  const dateNow = getNowString()
  const signatureString = calculateSignature(hkdf, 'us-east-1_EB9S7Q8au', ChallengeParameters.USER_ID_FOR_SRP, ChallengeParameters.SECRET_BLOCK, dateNow)

  console.log(JSON.stringify({
    ClientId: '5elcou6997jqr17rfhp8dr1hae',
    ChallengeName,
    ChallengeResponses: {
      PASSWORD_CLAIM_SIGNATURE: signatureString,
      PASSWORD_CLAIM_SECRET_BLOCK: ChallengeParameters.SECRET_BLOCK,
      TIMESTAMP: dateNow,
      USERNAME: ChallengeParameters.USER_ID_FOR_SRP
    },
    Session
  }));
  const respondToAuthChallenge = await call('AWSCognitoIdentityProviderService.RespondToAuthChallenge', {
    ClientId: '5elcou6997jqr17rfhp8dr1hae',
    ChallengeName,
    ChallengeResponses: {
      PASSWORD_CLAIM_SIGNATURE: signatureString,
      PASSWORD_CLAIM_SECRET_BLOCK: ChallengeParameters.SECRET_BLOCK,
      TIMESTAMP: dateNow,
      USERNAME: ChallengeParameters.USER_ID_FOR_SRP
    },
    Session
  });

  console.log('respondToAuthChallenge', respondToAuthChallenge);
}

run();