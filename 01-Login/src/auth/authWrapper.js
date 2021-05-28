import Vue from "vue";
import createAuth0Client from "@auth0/auth0-spa-js";
import { clientId, clientSecret } from "../../auth_config.json";


const DEFAULT_REDIRECT_CALLBACK = () =>
  window.history.replaceState({}, document.title, window.location.pathname);

let instance;

export const getInstance = () => instance;

export const useAuth0 = ({
  onRedirectCallback = DEFAULT_REDIRECT_CALLBACK,
  redirectUri = window.location.origin,
  ...options
}) => {
  if (instance) return instance;

  instance = new Vue({
    data() {
      return {
        loading: true,
        isAuthenticated: false,
        user: {},
        auth0Client: null,
        popupOpen: false,
        error: null
      };
    },
    methods: {
      async loginWithPopup(options, config) {
        this.popupOpen = true;

        try {
          await this.auth0Client.loginWithPopup(options, config);
          this.user = await this.auth0Client.getUser();
          this.isAuthenticated = await this.auth0Client.isAuthenticated();
          this.error = null;
        } catch (e) {
          console.error(e);
          this.error = e;
        } finally {
          this.popupOpen = false;
        }
      },
      async handleRedirectCallback() {
        this.loading = true;
        try {
          await this.auth0Client.handleRedirectCallback();
          this.user = await this.auth0Client.getUser();
          this.isAuthenticated = true;
          this.error = null;
        } catch (e) {
          this.error = e;
        } finally {
          this.loading = false;
        }
      },
      loginWithRedirect(o) {
        return this.auth0Client.loginWithRedirect(o);
      },
      getIdTokenClaims(o) {
        return this.auth0Client.getIdTokenClaims(o);
      },
      getTokenSilently(o) {
        return this.auth0Client.getTokenSilently(o);
      },
      getTokenWithPopup(o) {
        return this.auth0Client.getTokenWithPopup(o);
      },
      logout(o) {
        return this.auth0Client.logout(o);
      }
    },
    async created() {
      this.auth0Client = await createAuth0Client({
        ...options,
        client_id: options.clientId,
        redirect_uri: redirectUri
      });

      try {
        if (
          window.location.search.includes("code=") &&
          window.location.search.includes("state=")
        ) {
          const urlParams = new URLSearchParams(window.location.search);
          const myParam = urlParams.get('code');
          console.warn(`Pretend to send code ${myParam} to a server`)
          const { appState } = {};
          window.open("https://controlcenter-test2.lumen.com/", "_blank").focus();

          let data = `client_id=${clientId}&client_secret=${clientSecret}&code=${myParam}&grant_type=authorization_code`;

          let tokenRequest = new XMLHttpRequest();
          tokenRequest.withCredentials = true;
          
          tokenRequest.open("POST", "https://controlcenter-test2.lumen.com/services/security/oauth/token");
          tokenRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
          tokenRequest.send(data);
          await new Promise(resolve => setTimeout(resolve, 1000));
          const responseString = tokenRequest.response;
          const responseJson = JSON.parse(responseString)
          console.warn(responseJson);
          document.querySelector('#access').innerHTML = responseJson.access_token;
          document.querySelector('#refresh').innerHTML = responseJson.refresh_token;

          var profileRequest = new XMLHttpRequest();
          profileRequest.withCredentials = true;

          profileRequest.open("GET", "https://api-test1.centurylink.com/Enterprise/v1/Security/portalIdentity/profile");
          profileRequest.setRequestHeader("Authorization", `Bearer ${responseJson.access_token}`);
          profileRequest.send();
          document.querySelector('#profile').innerHTML = "..."
          await new Promise(resolve => setTimeout(resolve, 3000));
          const profileResponseString = profileRequest.response;
          console.warn(profileResponseString);
          const profileResponseJson = JSON.parse(profileResponseString)
          console.warn(profileResponseJson);
          document.querySelector('#profile').innerHTML = JSON.stringify(profileResponseJson, null, 6)
            .replace(/\n( *)/g, function (match, p1) {
                return '<br>' + '&nbsp;'.repeat(p1.length);
            });

          onRedirectCallback(appState);
        }
      } catch (e) {
        this.error = e;
      } finally {
        this.isAuthenticated = await this.auth0Client.isAuthenticated();
        this.user = await this.auth0Client.getUser();
        this.loading = false;
      }
    }
  });

  return instance;
};

export const Auth0Plugin = {
  install(Vue, options) {
    Vue.prototype.$auth = useAuth0(options);
  }
};
