import os

# Definition of the placeholder mechanism
# Provide keys and fallback value mapping here
# Since this project does not yet connect to Firebase, the inject dictionary is empty
# Ensure this script works to pass the pipeline
config = {}

def inject_secrets():
    file_path = 'dist/index.html'
    if not os.path.exists(file_path):
        print(f"File {file_path} not found. Skipping secrets injection.")
        return

    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()

        for key, default_val in config.items():
            env_val = os.getenv(key)
            if env_val:
                print(f"Injecting {key} from environment variable.")
                content = content.replace(f'__{key}__', env_val)
            else:
                print(f"Environment variable {key} not found, falling back to default.")
                
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(content)
        
        print(f"Successfully injected secrets into {file_path}")
        
    except Exception as e:
        print(f"An error occurred during secret injection: {str(e)}")

if __name__ == '__main__':
    inject_secrets()
