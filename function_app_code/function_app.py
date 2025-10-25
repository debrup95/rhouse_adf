import azure.functions as func
import logging,json
from tarnsformations.transformation_utils import getway

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)


@app.function_name(name="rehouzd_function")
@app.route(route="rehouzd_function")
def rehouzd_function(req: func.HttpRequest) -> func.HttpResponse:
    try:

        logging.info('Python HTTP trigger function processed a request.')
        dic =  req.params
        process_key = req.params.get('process_key')
        process_key = str(process_key).strip()
        logging.info(process_key)

        if not process_key:
            try:
                req_body = req.get_json()
            except ValueError:
                pass
            else:
                dic = req_body
                process_key = req_body.get('process_key')

        if process_key:
            val = getway(process_key,dic)
            if val:
                return func.HttpResponse(
                    json.dumps({"value": val}),  
                    status_code=200,
                    mimetype="application/json"
                ) 
            return func.HttpResponse(f"Hello, {process_key} Not found. triggers executed successfully.",status_code=200)       
        else:
            return func.HttpResponse(
                "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.",
                status_code=400
            )
    except Exception as err:
        return func.HttpResponse(
                f"This HTTP triggered function executed successfully. And the error occured  - {str(err)}.",
                status_code=400
            )

    
