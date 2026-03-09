import pexpect
import sys

# Server Details
PASSWORD = 'hZ1wV8qH8c'
HOST = 'leadgin@leadgin.ftp.tools'

def run_remote_command(command, description):
    print(f"\n--- Running: {description} ---")
    ssh_command = f"ssh -p 22 {HOST} \"{command}\""
    
    # Start the SSH process
    child = pexpect.spawn(ssh_command, encoding='utf-8')
    child.logfile = sys.stdout
    
    try:
        # Expect the password prompt
        i = child.expect(['assword:', pexpect.EOF, pexpect.TIMEOUT], timeout=15)
        
        if i == 0:
            # Send the password
            child.sendline(PASSWORD)
            
            # Wait for the command to finish
            child.expect(pexpect.EOF, timeout=120)
            print(f"\n✅ Finished: {description}")
        elif i == 1:
            print(f"\n⚠️ Encountered EOF before prompt for {description}")
        elif i == 2:
            print(f"\n❌ Timeout waiting for prompt for {description}")
            
    except Exception as e:
        print(f"\n❌ Exception during {description}: {str(e)}")

# Command 1: Install frontend dependency
frontend_cmd = "cd /home/leadgin/mirvalut.com/src/svit_valut/frontend && npm install react-helmet-async --save"
# Command 2: Rerun backend migrations
backend_cmd = "cd /home/leadgin/mirvalut.com/src/svit_valut/backend && source venv/bin/activate && python -c 'from app.core.migrations import run_migrations; run_migrations()'"
# Command 3: Restart services
restart_cmd = "cd /home/leadgin/mirvalut.com/src/svit_valut && ./restart.sh"

run_remote_command(frontend_cmd, "Installing frontend dependencies")
run_remote_command(backend_cmd, "Running database migrations")
run_remote_command(restart_cmd, "Restarting server")
