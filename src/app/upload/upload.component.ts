import { Component, OnInit,ViewEncapsulation, ViewChild, ElementRef, PipeTransform, Pipe, AfterContentInit } from '@angular/core';
import { DomSanitizer } from "@angular/platform-browser";
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
//import * as AWS from 'aws-sdk-2.517.0.min.js';
//import * as AmazonCognitoIdentity from 'amazon-cognito-identity.min.js';

@Pipe({ name: 'safe' })
export class SafePipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) { }
  transform(url) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}

declare var AWS: any;
declare var AmazonCognitoIdentity: any;
@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent implements OnInit, AfterContentInit {
  fetchedDetails: any
  apiurl: string

  awsData = {
    cognitoAuthenticatedUserName: 'bappa_quicksight',
    cognitoAuthenticatedUserPassword: 'Test@1234',
    dashboardId: 'xxxx',
    region: 'us-east-1',
    cognitoIdentityPoolId: 'xxxxx',
    cognitoAuthenticatedUserPoolId: 'xxxx',
    cognitoAuthenticatedClientId: 'xxxx',
    roleSessionName: 'xxxxx',
    apiGatewayUrl: 'xxxxxx',
    cognitoAuthenticatedLogins: 'cognito-idp.us-east-1.amazonaws.com/xxxx'
  }

  constructor(private http: HttpClient) {
    this.fetchedDetails = 'https://blog.angular-university.io/angular-http/';
    this.apiurl = environment.apiurl;
  }

  ngOnInit() {
    this.embedDashboardCognitoAuthenticated(this.awsData)
  }
  ngAfterContentInit() {

  }

  onApiFech() {
    let httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    };
    this.http.get(this.apiurl + '/pets', httpOptions).subscribe(data => {
      this.fetchedDetails = JSON.stringify(data)
    })

  }

  embedDashboardCognitoAuthenticated(awsData) {
    AWS.config.update({ region: awsData.region });

    const cognitoUser = this.getCognitoUser(awsData.cognitoAuthenticatedUserPoolId, awsData.cognitoAuthenticatedClientId, awsData.cognitoAuthenticatedUserName);
    const authenticationDetails = this.getAuthenticationDetails(awsData.cognitoAuthenticatedUserName, awsData.cognitoAuthenticatedUserPassword);

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        console.log(result);
        const cognitoIdentity = new AWS.CognitoIdentity();

        const getIdParams = {
          IdentityPoolId: awsData.cognitoIdentityPoolId,
          Logins: { [awsData.cognitoAuthenticatedLogins]: result.idToken.jwtToken }
        };

        cognitoIdentity.getId(getIdParams, (err, data) => {
          if (err) {
            console.log('Error obtaining Cognito ID.');
          } else {
            data.Logins = { [awsData.cognitoAuthenticatedLogins]: result.idToken.jwtToken };

            cognitoIdentity.getOpenIdToken(data, (err, openIdToken) => {
              if (err) {
                console.log('Error obtaining authentication token.');
              } else {
                this.apiGatewayGetDashboardEmbedUrl(
                  awsData.apiGatewayUrl,
                  awsData.dashboardId,
                  openIdToken.Token,
                  true,
                  awsData.roleSessionName,
                  false,
                  false
                );
              }
            });
          }
        });
      },

      onFailure: function (err) {
        console.log('Error authenticating user.');
      }
    });
  }

  apiGatewayGetDashboardEmbedUrl(apiGatewayUrl,
    dashboardId,
    openIdToken,
    authenticated,
    sessionName,
    resetDisabled,
    undoRedoDisabled
  ) {
    const parameters = {
      dashboardId: dashboardId,
      openIdToken: openIdToken,
      authenticated: authenticated,
      sessionName: sessionName,
      resetDisabled: resetDisabled,
      undoRedoDisabled: undoRedoDisabled
    }

    // const myQueryString = $.param(parameters);
    // apiGatewayUrl = apiGatewayUrl + myQueryString;


    let params = new HttpParams()
    params = params.append('dashboardId', dashboardId);
    params = params.append('openIdToken', openIdToken);
    params = params.append('authenticated', authenticated);
    params = params.append('sessionName', sessionName);
    params = params.append('resetDisabled', resetDisabled);
    params = params.append('undoRedoDisabled', undoRedoDisabled);

    // let httpOptions = {
    //   headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    //   options: new HttpParams(params)
    // };
    let Httpparams = { params: params, headers: new HttpHeaders({ 'Content-Type': 'application/json' }) }
    this.http.get(apiGatewayUrl, Httpparams).subscribe(data => {
      let res = JSON.parse(JSON.stringify(data))
      this.fetchedDetails  = res.EmbedUrl
    })
  }

  getCognitoUser(userPoolId, clientId, userName) {
    // Step 1: Get user pool.
    const poolData = {
      UserPoolId: userPoolId,
      ClientId: clientId
    };
    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    // Step 2: Get cognito user.
    const userData = {
      Username: userName,
      Pool: userPool
    };
    return new AmazonCognitoIdentity.CognitoUser(userData);
  }

  /**
   * TODO - Move authentication functions to its own class.
   */
  getAuthenticationDetails(userName, userPassword) {
    const authenticationData = {
      Username: userName,
      Password: userPassword
    };
    return new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
  }


}
