import socket
import threading
import time
import random
from concurrent.futures import ThreadPoolExecutor
import http.client

# Web application parameters
TARGET_HOST = "10.20.139.138"
TARGET_PORT = 8000
TARGET_PATH = "/tasks"
REQUEST_TIMEOUT = 5

# Test configuration
NUM_CONNECTIONS = 2000
TEST_DURATION = 60  # Duration in seconds
REPORT_INTERVAL = 20  # Report stats every 5 seconds

# Statistics tracking
successful_requests = 0
failed_requests = 0
response_times = []
lock = threading.Lock()

def send_http_request():
    """Send HTTP request to target web application"""
    global successful_requests, failed_requests, response_times
    
    start_time = time.time()
    try:
        # Create connection
        conn = http.client.HTTPConnection(TARGET_HOST, TARGET_PORT, timeout=REQUEST_TIMEOUT)
        
        # Add some randomization to simulate real users
        headers = {
            "User-Agent": f"LoadTest/1.0 (Python/{random.randint(1, 1000)})",
            "Accept": "text/html,application/json",
            "Connection": "close"  # Don't keep connection alive
        }
        
        # Send request
        conn.request("GET", TARGET_PATH, headers=headers)
        
        # Get response
        response = conn.getresponse()
        response.read()  # Read the response to complete the request
        conn.close()
        
        duration = time.time() - start_time
        
        with lock:
            successful_requests += 1
            response_times.append(duration)
            
    except Exception as e:
        with lock:
            failed_requests += 1
            print(f"Request error: {e}")
        
        duration = time.time() - start_time
    
    return duration

def report_stats():
    """Report current statistics"""
    end_time = time.time() + TEST_DURATION
    last_report_time = time.time()
    last_success = 0
    last_fail = 0
    
    while time.time() < end_time:
        time.sleep(0.1)  # Check frequently without burning CPU
        
        current_time = time.time()
        if current_time - last_report_time >= REPORT_INTERVAL:
            with lock:
                current_success = successful_requests
                current_fail = failed_requests
                
                # Calculate response times stats
                avg_response = 0
                if response_times:
                    avg_response = sum(response_times) / len(response_times)
                    response_times.clear()  # Reset for next period
                
            success_rate = (current_success - last_success) / REPORT_INTERVAL
            fail_rate = (current_fail - last_fail) / REPORT_INTERVAL
            
            print(f"Requests/sec: {success_rate:.2f} successful, {fail_rate:.2f} failed")
            print(f"Total: {current_success} successful, {current_fail} failed")
            print(f"Average response time: {avg_response*1000:.2f}ms")
            print("-" * 50)
            
            last_report_time = current_time
            last_success = current_success
            last_fail = current_fail

def main():
    print(f"Starting Web Application Load Test on {TARGET_HOST}:{TARGET_PORT}{TARGET_PATH}")
    print(f"Duration: {TEST_DURATION} seconds with {NUM_CONNECTIONS} concurrent connections")
    print("-" * 50)
    
    # Start stats reporting in a separate thread
    stats_thread = threading.Thread(target=report_stats)
    stats_thread.daemon = True
    stats_thread.start()
    
    # Run the load test
    start_time = time.time()
    end_time = start_time + TEST_DURATION
    
    with ThreadPoolExecutor(max_workers=NUM_CONNECTIONS) as executor:
        while time.time() < end_time:
            # Submit new request tasks
            futures = [executor.submit(send_http_request) for _ in range(NUM_CONNECTIONS)]
            # Wait briefly between batches
            time.sleep(0.5)
    
    # Final report
    print("\nTest completed")
    print(f"Total successful requests: {successful_requests}")
    print(f"Total failed requests: {failed_requests}")
    print(f"Success rate: {successful_requests/(successful_requests+failed_requests or 1)*100:.2f}%")

if __name__ == "__main__":
    main()