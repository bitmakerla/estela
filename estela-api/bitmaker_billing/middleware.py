class BillingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        print("code excuted for each request before the view")

        response = self.get_response(request)

        print("code excuted for each request after the view")

        return response
