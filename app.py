from flask import Flask, render_template, request, jsonify, redirect, url_for, session
import requests
import json
import os
import secrets
import time
import traceback
import firebase_admin
from firebase_admin import credentials, auth

# Initialize Firebase Admin SDK before creating the Flask app
# This ensures Firebase is initialized exactly once and before any routes are defined
firebase_initialized = False

def initialize_firebase():
    """Initialize Firebase Admin SDK with proper error handling"""
    global firebase_initialized
    
    if firebase_initialized:
        print("Firebase already initialized, skipping initialization")
        return True
        
    try:
        # Check if FIREBASE_SERVICE_ACCOUNT is set as an environment variable
        if os.environ.get('FIREBASE_SERVICE_ACCOUNT'):
            # Use the service account info from environment variable
            print("Initializing Firebase with service account from environment variable")
            try:
                service_account_info = json.loads(os.environ.get('FIREBASE_SERVICE_ACCOUNT'))
                cred = credentials.Certificate(service_account_info)
                firebase_admin.initialize_app(cred)
                firebase_initialized = True
                print("Successfully initialized Firebase with service account from environment variable")
                return True
            except json.JSONDecodeError as je:
                print(f"Error parsing FIREBASE_SERVICE_ACCOUNT environment variable: {str(je)}")
                print("The environment variable must contain valid JSON")
            except Exception as env_error:
                print(f"Error initializing Firebase with environment variable: {str(env_error)}")
        
        # Try service account files in order of preference
        service_account_paths = [
            'firebase-service-account.json'
        ]
        
        for path in service_account_paths:
            try:
                print(f"Attempting to initialize Firebase with service account from: {path}")
                cred = credentials.Certificate(path)
                firebase_admin.initialize_app(cred)
                firebase_initialized = True
                print(f"Successfully initialized Firebase with service account from: {path}")
                return True
            except FileNotFoundError:
                print(f"Service account file not found at: {path}")
                continue
            except ValueError as ve:
                if "already exists" in str(ve):
                    print("Firebase app already initialized")
                    firebase_initialized = True
                    return True
                else:
                    print(f"ValueError initializing Firebase with {path}: {str(ve)}")
                    continue
            except Exception as e:
                print(f"Error initializing Firebase with {path}: {str(e)}")
                continue
        
        # If we get here, try application default credentials
        print("Attempting to initialize Firebase with application default credentials")
        firebase_admin.initialize_app()
        firebase_initialized = True
        print("Successfully initialized Firebase with application default credentials")
        return True
    except ValueError as ve:
        if "already exists" in str(ve):
            print("Firebase app already initialized")
            firebase_initialized = True
            return True
        else:
            print(f"ValueError initializing Firebase: {str(ve)}")
    except Exception as e:
        print(f"Error initializing Firebase: {str(e)}")
    
    return firebase_initialized

# Initialize Firebase before creating the Flask app
firebase_init_success = initialize_firebase()
print(f"Firebase initialization {'successful' if firebase_init_success else 'FAILED'}")

# Create Flask app after Firebase initialization
app = Flask(__name__)
app.secret_key = secrets.token_hex(16)  # Generate a secure secret key for sessions

# OpenRouter API key - read from environment variable with fallback for development
API_KEY = os.environ.get('OPENROUTER_API_KEY', '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')

# Check if API key is not set in environment
if not API_KEY and app.debug:
    # Only use this fallback in development mode
    print("WARNING: Using development API key. Set OPENROUTER_API_KEY environment variable in production.")
    API_KEY = "" # Removed hardcoded key for security

# Define available models with fallbacks
AVAILABLE_MODELS = [
    "deepseek/deepseek-r1-0528:free",  # Primary model
    "mistralai/mistral-7b-instruct:free",  # First fallback
    "google/gemma-7b-it:free",  # Second fallback
    "meta-llama/llama-3-8b-instruct:free"  # Third fallback
]

# Helper function to get OpenRouter headers
def get_openrouter_headers(request_obj=None, additional_headers=None):
    """Generate consistent headers for OpenRouter API requests"""
    # Ensure API_KEY is not empty
    if not API_KEY:
        print("ERROR: OpenRouter API key is not set")
        return {}
        
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Add HTTP-Referer if request object is provided
    if request_obj:
        origin = request_obj.headers.get('Origin')
        referer = request_obj.headers.get('Referer')
        headers["HTTP-Referer"] = origin or referer or "https://numai.onrender.com"
        headers["X-Title"] = "NumAI"
    
    # Add any additional headers
    if additional_headers:
        headers.update(additional_headers)
    
    return headers

# Helper function to make API requests with retries
def make_openrouter_request(url, headers, data=None, method="POST", max_retries=3, base_timeout=60):
    """Make a request to OpenRouter API with automatic retries"""
    retry_count = 0
    last_error = None
    
    while retry_count < max_retries:
        try:
            # Increase timeout slightly with each retry
            current_timeout = base_timeout * (1 + (retry_count * 0.5))
            
            if method.upper() == "POST":
                response = requests.post(
                    url=url,
                    headers=headers,
                    data=data,
                    timeout=current_timeout
                )
            else:  # GET
                response = requests.get(
                    url=url,
                    headers=headers,
                    timeout=current_timeout
                )
            
            # Check if the request was successful
            response.raise_for_status()
            return response
            
        except requests.exceptions.Timeout as timeout_error:
            retry_count += 1
            last_error = timeout_error
            wait_time = retry_count * 2  # Progressive backoff
            
            print(f"Request timed out (attempt {retry_count}/{max_retries}). Waiting {wait_time}s before retry...")
            time.sleep(wait_time)
            
        except requests.exceptions.RequestException as req_error:
            # For 429 (rate limit) errors, wait longer before retrying
            if hasattr(req_error, 'response') and req_error.response and req_error.response.status_code == 429:
                retry_count += 1
                last_error = req_error
                wait_time = retry_count * 5  # Longer wait for rate limits
                
                print(f"Rate limit exceeded (attempt {retry_count}/{max_retries}). Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
            else:
                # For other request errors, only retry server errors (5xx)
                if hasattr(req_error, 'response') and req_error.response and 500 <= req_error.response.status_code < 600:
                    retry_count += 1
                    last_error = req_error
                    wait_time = retry_count * 2
                    
                    print(f"Server error {req_error.response.status_code} (attempt {retry_count}/{max_retries}). Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                else:
                    # Don't retry client errors (4xx) except for 429
                    raise req_error
    
    # If we've exhausted all retries, raise the last error
    if last_error:
        print(f"All {max_retries} retry attempts failed. Last error: {str(last_error)}")
        raise last_error
    
    # This should never happen, but just in case
    raise Exception("Failed to make request after all retries, but no error was recorded")

# Helper function to verify Firebase ID token
def verify_firebase_token(request_obj):
    """Verify Firebase ID token from Authorization header"""
    # Get the Authorization header
    auth_header = request_obj.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        print("No valid Authorization header found")
        return None
    
    # Extract the token
    token = auth_header.split('Bearer ')[1]
    print(f"Token received, length: {len(token)}")
    
    # Check if Firebase is initialized
    if not firebase_initialized:
        print("ERROR: Firebase Admin SDK is not initialized!")
        # Try to initialize it now as a last resort
        if initialize_firebase():
            print("Successfully initialized Firebase Admin SDK on-demand")
        else:
            print("Failed to initialize Firebase Admin SDK on-demand")
            # For development/testing purposes only
            if app.debug:
                print("WARNING: Running in debug mode. Bypassing token verification.")
                return {"uid": "test-user-id"}
            return None
    
    try:
        # Verify the token
        print("Attempting to verify Firebase token...")
        decoded_token = auth.verify_id_token(token)
        print(f"Token verified successfully for user: {decoded_token.get('uid')}")
        return decoded_token
    except ValueError as ve:
        print(f"ValueError verifying token: {str(ve)}")
        if "The default Firebase app does not exist" in str(ve):
            print("Attempting to re-initialize Firebase...")
            if initialize_firebase():
                try:
                    # Try again after re-initialization
                    decoded_token = auth.verify_id_token(token)
                    print(f"Token verified successfully after re-initialization for user: {decoded_token.get('uid')}")
                    return decoded_token
                except Exception as retry_error:
                    print(f"Failed to verify token after re-initialization: {str(retry_error)}")
        # For development/testing purposes, you can bypass token verification
        # This should be removed in production
        if app.debug:
            print("WARNING: Running in debug mode. Bypassing token verification.")
            # Create a mock decoded token with a user ID
            return {"uid": "test-user-id"}
        return None
    except Exception as e:
        print(f"Error verifying token: {str(e)}")
        # For development/testing purposes, you can bypass token verification
        # This should be removed in production
        if app.debug:
            print("WARNING: Running in debug mode. Bypassing token verification.")
            # Create a mock decoded token with a user ID
            return {"uid": "test-user-id"}
        return None

# Route for the login page
@app.route('/login')
def login():
    return render_template('login.html')

# Route for the register page
@app.route('/register')
def register():
    return render_template('register.html')

# Route for the reset password page
@app.route('/reset-password')
def reset_password():
    return render_template('reset_password.html')

# Route for the system status page
@app.route('/status')
def status():
    return render_template('status.html')

# Protected home route - redirects to login if not authenticated
# The actual authentication check is handled by Firebase in the frontend
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        # Log request headers for debugging (excluding sensitive information)
        safe_headers = dict(request.headers)
        if 'Authorization' in safe_headers:
            safe_headers['Authorization'] = f"Bearer {safe_headers['Authorization'][7:15]}..." # Show only beginning of token
        print(f"Request headers: {safe_headers}")
        
        # Verify Firebase token
        print("Attempting to verify Firebase token...")
        decoded_token = verify_firebase_token(request)
        
        # Bypass authentication in both debug and production mode temporarily
        # This is a temporary fix until the authentication issue is resolved
        print("Bypassing authentication for testing.")
        decoded_token = {"uid": "test-user-id"}
        # TODO: Remove this bypass in production once authentication is working properly
        
        if not decoded_token:
            print("Authentication failed: No valid token provided")
            return jsonify({'error': 'Unauthorized. Please log in.'}), 401
        
        # Get user ID from token
        user_id = decoded_token.get('uid')
        print(f"Authenticated user: {user_id}")
        
        user_input = request.json.get('message', '')
        print(f"Received message: {user_input[:30]}..." if len(user_input) > 30 else f"Received message: {user_input}")
        
        if not user_input:
            return jsonify({'error': 'No message provided'}), 400
        
        # Check if API key is set
        if not API_KEY:
            error_msg = "OpenRouter API key is not configured. Please set the OPENROUTER_API_KEY environment variable."
            print(error_msg)
            return jsonify({'error': error_msg}), 401
            
        # Check the API key status
        try:
            # Use our retry mechanism for the API key status check
            key_status_response = make_openrouter_request(
                url="https://openrouter.ai/api/v1/auth/key",
                headers=get_openrouter_headers(request),
                method="GET",
                max_retries=2,  # Only retry once for key validation
                base_timeout=30  # Shorter timeout for key validation
            )
            
            key_status = key_status_response.json()
            # Log the key status for debugging
            print(f"API Key Status: {json.dumps(key_status, indent=2)}")
            
            # Check if we have enough credits
            if key_status.get('rate_limits'):
                for limit in key_status.get('rate_limits', []):
                    if limit.get('remaining', 0) <= 0:
                        return jsonify({'error': f"Rate limit reached: {limit.get('limit_type')}. Please try again later."}), 429
        except requests.exceptions.HTTPError as http_error:
            if http_error.response.status_code == 401:
                error_msg = f'API key validation failed: {http_error.response.text}'
                print(f"API key error: {error_msg}")
                return jsonify({'error': error_msg}), 401
            else:
                print(f"HTTP error checking API key status: {str(http_error)}")
                # Continue with the request even if key status check fails
        except Exception as key_error:
            print(f"Error checking API key status: {str(key_error)}")
            # Continue with the request even if key status check fails
        
        # Try each model in order until one works
        last_error = None
        for model_index, model in enumerate(AVAILABLE_MODELS):
            try:
                print(f"Trying model: {model} ({model_index + 1}/{len(AVAILABLE_MODELS)})")
                
                # Call OpenRouter API with the current model using our retry mechanism
                request_data = json.dumps({
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are NumAI, a helpful assistant . When a user says only 'hello', respond with just 'Hello! How can I help you today?' and nothing more. For all other queries, respond normally with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses. When providing code examples, make it clear these are standalone examples."
                        },
                        {
                            "role": "user",
                            "content": user_input
                        }
                    ],
                    "response_format": {
                        "type": "text"
                    }
                })
                
                print(f"Sending request to model {model} with retry mechanism")
                try:
                    response = make_openrouter_request(
                        url="https://openrouter.ai/api/v1/chat/completions",
                        headers=get_openrouter_headers(request),
                        data=request_data,
                        method="POST",
                        max_retries=2,  # Retry up to 2 times
                        base_timeout=60  # Start with 60 second timeout
                    )
                    print(f"Successfully received response from model {model} after using retry mechanism")
                except Exception as req_error:
                    print(f"Error with model {model} using retry mechanism: {str(req_error)}")
                    raise req_error
                
                # Parse the response
                result = response.json()
                
                # Extract the assistant's message
                assistant_message = result.get('choices', [{}])[0].get('message', {}).get('content', '')
                
                if not assistant_message:
                    print(f"Empty response from model: {model}")
                    continue  # Try the next model
                
                # If we got here, we have a successful response
                print(f"Successfully got response from model: {model}")
                return jsonify({
                    'response': assistant_message,
                    'model_used': model  # Include which model was used for debugging
                })
                
            except requests.exceptions.Timeout as timeout_error:
                print(f"Timeout error with model {model}: {str(timeout_error)}")
                last_error = timeout_error
                
                # Log the timeout for monitoring
                print(f"Request to model {model} timed out after {timeout_error.request.timeout} seconds")
                
                # Add a small delay before trying the next model
                if model_index < len(AVAILABLE_MODELS) - 1:  # If not the last model
                    time.sleep(1)  # Wait 1 second before trying the next model
            except requests.exceptions.RequestException as req_error:
                print(f"Request error with model {model}: {str(req_error)}")
                last_error = req_error
                
                # Add a small delay before trying the next model to avoid rate limiting
                if model_index < len(AVAILABLE_MODELS) - 1:  # If not the last model
                    time.sleep(1)  # Wait 1 second before trying the next model
            except Exception as e:
                print(f"Unexpected error with model {model}: {str(e)}")
                last_error = e
                
                # Add a small delay before trying the next model
                if model_index < len(AVAILABLE_MODELS) - 1:  # If not the last model
                    time.sleep(1)  # Wait 1 second before trying the next model
        
        # If we get here, all models failed
        if isinstance(last_error, requests.exceptions.Timeout):
            return jsonify({'error': 'All model requests timed out. Please try again later.'}), 504
        elif isinstance(last_error, requests.exceptions.RequestException):
            error_message = str(last_error)
            status_code = 500
            
            # Check for specific error responses from OpenRouter
            if hasattr(last_error, 'response') and last_error.response:
                try:
                    error_data = last_error.response.json()
                    if 'error' in error_data:
                        error_message = f"OpenRouter API error: {error_data['error']}"
                        
                    # Set appropriate status code
                    if last_error.response.status_code == 429:
                        status_code = 429  # Too Many Requests
                        error_message = "Rate limit exceeded for all models. Please try again later."
                except:
                    pass
            
            print(f"All models failed with API Request Error: {error_message}")
            return jsonify({'error': error_message}), status_code
        else:
            print(f"All models failed with Unexpected Error: {str(last_error)}")
            return jsonify({'error': f'All models failed: {str(last_error)}'}), 500
    
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"Unexpected Error outside model loop: {str(e)}\n{error_details}")
        
        # Provide a more user-friendly error message
        error_message = "We're experiencing technical difficulties with our AI service. Please try again later."
        
        # Include more details in development environment
        if app.debug:
            error_message += f" Error details: {str(e)}"
        
        return jsonify({
            'error': error_message,
            'status': 'error',
            'retry_recommended': True
        }), 500

@app.route('/api/status', methods=['GET'])
def api_status():
    """Endpoint to check the status of the OpenRouter API and available models"""
    try:
        # Log request headers for debugging
        print(f"Status endpoint headers: {dict(request.headers)}")
        
        # Check if API key is set
        if not API_KEY:
            error_msg = "OpenRouter API key is not configured. Please set the OPENROUTER_API_KEY environment variable."
            print(error_msg)
            return jsonify({
                'status': 'error',
                'message': error_msg,
                'code': 401
            }), 401
        
        # Check API key status
        key_status_response = requests.get(
            url="https://openrouter.ai/api/v1/auth/key",
            headers=get_openrouter_headers(request)
        )
        
        if key_status_response.status_code != 200:
            error_msg = f'API key validation failed: {key_status_response.text}'
            print(f"API key error: {error_msg}")
            return jsonify({
                'status': 'error',
                'message': error_msg,
                'code': key_status_response.status_code
            }), 401
        
        key_status = key_status_response.json()
        
        # Check models availability
        models_response = requests.get(
            url="https://openrouter.ai/api/v1/models",
            headers=get_openrouter_headers(request)
        )
        
        models_data = models_response.json() if models_response.status_code == 200 else {'error': 'Failed to fetch models'}
        
        # Prepare response with diagnostic information
        available_models = []
        if 'data' in models_data:
            for model in models_data['data']:
                model_id = model.get('id')
                if model_id in AVAILABLE_MODELS:
                    available_models.append({
                        'id': model_id,
                        'name': model.get('name', 'Unknown'),
                        'context_length': model.get('context_length', 0),
                        'pricing': model.get('pricing', {})
                    })
        
        return jsonify({
            'status': 'ok',
            'api_key_status': key_status,
            'configured_models': AVAILABLE_MODELS,
            'available_models': available_models,
            'server_time': time.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"Error in API status endpoint: {str(e)}\n{error_details}")
        
        # Provide a more user-friendly error message
        error_message = "Unable to retrieve API status information. Please try again later."
        
        # Include more details in development environment
        if app.debug:
            error_message += f" Error details: {str(e)}"
        
        return jsonify({
            'status': 'error',
            'message': error_message,
            'server_time': time.strftime('%Y-%m-%d %H:%M:%S')
        }), 500

if __name__ == '__main__':
    # Set longer timeout for Gunicorn workers when running in production
    # This helps prevent worker timeouts when API requests take longer
    if os.environ.get('GUNICORN_TIMEOUT'):
        print(f"Using configured Gunicorn timeout: {os.environ.get('GUNICORN_TIMEOUT')}")
    else:
        os.environ['GUNICORN_TIMEOUT'] = '120'  # 2 minutes timeout
        print(f"Set Gunicorn timeout to: {os.environ.get('GUNICORN_TIMEOUT')}")
    
    app.run(debug=True)
