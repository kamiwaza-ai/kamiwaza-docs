# Starting Ray

Ray is a powerful distributed computing framework that Kamiwaza uses for various tasks. This guide will help you start Ray using the provided script, and has some information about caveats using Kamiwaza with your existing ray cluster.

## Using the start-ray.sh Script

The easiest way to start Ray is by using the `start-ray.sh` script provided with Kamiwaza. This script automatically configures Ray based on your system's capabilities and environment variables.

To use the script:

1. Open a terminal and navigate to your Kamiwaza directory.
2. Run the following command:

   ```bash
   ./start-ray.sh
   ```

The script will:
- Activate the virtual environment
- Set necessary environment variables
- Determine the number of CPUs and GPUs available
- Start Ray with appropriate parameters

## Connecting to an Existing Ray Cluster

If you have an existing Ray cluster and want to connect to it from your Kamiwaza application, you'll need to set up the connection manually in your code. Here's how you can do it:

1. Ensure you're in your Kamiwaza virtual environment:

   ```bash
   source venv/bin/activate
   ```

2. In your Python code, import Ray and set up the runtime environment:

   ```python
   import os
   import ray
   from ray import serve

   # Set the PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION environment variable
   os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"

   # Set up the runtime environment
   runtime_env = {
       "env_vars": {
           "PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION": "python"
       }
   }

   # Initialize Ray with the runtime environment
   ray.init(runtime_env=runtime_env)

   ```

   This approach ensures that the `PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION` environment variable is set for all Ray workers called from that code

   Note that this is generally **not needed** for Kamiwaza itself to run properly, as Kamiwaza will set the appropriate `runtime_env` settings; however, if you are, for example, importing kamiwaza into a Jupyter notebook which then taps into ray functionality, then you may need to use this technique.

3. After setting up the connection, you can use Ray as usual in your code.

## Customizing Ray Configuration

When using the `start-ray.sh` script, you can customize the Ray configuration by setting these environment variables before running the script:

- `KAMIWAZA_NUM_CPUS`: Override the number of CPUs Ray will use
- `KAMIWAZA_NUM_GPUS`: Override the number of GPUs Ray will use

For example:

```bash
export KAMIWAZA_NUM_CPUS=4
export KAMIWAZA_NUM_GPUS=1
./start-ray.sh
```

This will start Ray with 4 CPUs and 1 GPU, regardless of the system's actual hardware configuration. This can be useful for testing or when you want to limit Ray's resource usage.
