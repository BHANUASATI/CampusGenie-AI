"""
Microsoft Azure AD OAuth Service for Outlook/Microsoft Login
"""
import msal
import requests
from typing import Optional, Dict
from config import settings

class AzureADOAuth:
    """Microsoft Azure AD OAuth 2.0 Service"""
    
    def __init__(self):
        self.client_id = settings.AZURE_CLIENT_ID
        self.client_secret = settings.AZURE_CLIENT_SECRET
        self.tenant_id = settings.AZURE_TENANT_ID or "38fd5a4b-955f-455a-9ad2-d2daa5a4e4d0"
        self.redirect_uri = settings.AZURE_REDIRECT_URI
        self.authority = f"https://login.microsoftonline.com/{self.tenant_id}"
        self.scope = ["User.Read", "email", "profile"]
        
    def get_auth_url(self, state: Optional[str] = None) -> str:
        """Generate the OAuth authorization URL"""
        config = {
            "authority": self.authority,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "scope": self.scope,
        }
        
        app = msal.ConfidentialClientApplication(
            client_id=config["client_id"],
            authority=config["authority"],
            client_credential=config["client_secret"],
        )
        
        auth_url = app.get_authorization_request_url(
            scopes=self.scope,
            redirect_uri=self.redirect_uri,
            state=state
        )
        
        return auth_url
    
    def get_token_from_code(self, code: str) -> Optional[Dict]:
        """Exchange authorization code for access token"""
        config = {
            "authority": self.authority,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "scope": self.scope,
        }
        
        app = msal.ConfidentialClientApplication(
            client_id=config["client_id"],
            authority=config["authority"],
            client_credential=config["client_secret"],
        )
        
        try:
            result = app.acquire_token_by_authorization_code(
                code=code,
                scopes=self.scope,
                redirect_uri=self.redirect_uri
            )
            
            if "access_token" in result:
                return result
            else:
                print(f"Error acquiring token: {result.get('error_description', 'Unknown error')}")
                return None
                
        except Exception as e:
            print(f"Exception during token acquisition: {str(e)}")
            return None
    
    def get_user_info(self, access_token: str) -> Optional[Dict]:
        """Get user information from Microsoft Graph API"""
        try:
            graph_api_url = "https://graph.microsoft.com/v1.0/me"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(graph_api_url, headers=headers)
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Error fetching user info: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"Exception during user info fetch: {str(e)}")
            return None
    
    def get_user_email(self, access_token: str) -> Optional[str]:
        """Get user's email address"""
        try:
            graph_api_url = "https://graph.microsoft.com/v1.0/me/mail"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(graph_api_url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                return data.get("address")
            else:
                # Try alternative endpoint
                user_info = self.get_user_info(access_token)
                if user_info:
                    return user_info.get("mail") or user_info.get("userPrincipalName")
                return None
                
        except Exception as e:
            print(f"Exception during email fetch: {str(e)}")
            return None

# Global OAuth service instance
oauth_service = AzureADOAuth()