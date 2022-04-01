from credentials import Credentials

class LocalCredentials(Credentials):

    def __init__(self):
        pass
    
    def get_registry_token(self):
        return None
    
    def get_credentials(self):
        self.credentials["REGISTRY_TOKEN"] = self.get_registry_token()
        return self.credentials