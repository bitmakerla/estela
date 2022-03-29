

class LocalCredentials:
    credentials = {}

    def __init__(self):
        self.credentials["REGISTRY_TOKEN"] = self.get_registry_token()
    
    def get_registry_token(self):
        return None