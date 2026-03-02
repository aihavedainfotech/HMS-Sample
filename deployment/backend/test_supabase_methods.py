"""
Test different methods to connect to Supabase
"""

import psycopg2
import socket
import os

def test_connection_methods():
    """Test different connection methods to Supabase"""
    
    database_url = "postgresql://postgres:Sravan.9010@db.chbluhjswhkardbvntcl.supabase.co:5432/postgres"
    
    print("🔍 Testing Supabase Connection Methods...")
    
    # Method 1: Direct connection
    print("\n1️⃣ Testing direct connection...")
    try:
        conn = psycopg2.connect(database_url)
        print("✅ Direct connection successful!")
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Direct connection failed: {e}")
    
    # Method 2: Force IPv4
    print("\n2️⃣ Testing with IPv4 forced...")
    try:
        # Force IPv4 by setting socket family
        old_getaddrinfo = socket.getaddrinfo
        def force_ipv4(*args, **kwargs):
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, '', (args[0], args[1]))]
        
        socket.getaddrinfo = force_ipv4
        conn = psycopg2.connect(database_url)
        print("✅ IPv4 forced connection successful!")
        socket.getaddrinfo = old_getaddrinfo
        conn.close()
        return True
    except Exception as e:
        print(f"❌ IPv4 forced connection failed: {e}")
        socket.getaddrinfo = old_getaddrinfo
    
    # Method 3: Individual parameters
    print("\n3️⃣ Testing with individual parameters...")
    try:
        conn = psycopg2.connect(
            host="db.chbluhjswhkardbvntcl.supabase.co",
            port=5432,
            database="postgres",
            user="postgres",
            password="Sravan.9010",
            connect_timeout=10
        )
        print("✅ Individual parameters connection successful!")
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Individual parameters connection failed: {e}")
    
    # Method 4: Try with SSL mode
    print("\n4️⃣ Testing with SSL mode...")
    try:
        conn = psycopg2.connect(
            host="db.chbluhjswhkardbvntcl.supabase.co",
            port=5432,
            database="postgres",
            user="postgres",
            password="Sravan.9010",
            sslmode="require"
        )
        print("✅ SSL mode connection successful!")
        conn.close()
        return True
    except Exception as e:
        print(f"❌ SSL mode connection failed: {e}")
    
    # Method 5: Try HTTP tunnel check
    print("\n5️⃣ Testing basic connectivity...")
    try:
        import urllib.request
        response = urllib.request.urlopen("https://supabase.com", timeout=5)
        print("✅ Basic internet connectivity works")
    except Exception as e:
        print(f"❌ Basic connectivity failed: {e}")
    
    return False

if __name__ == "__main__":
    success = test_connection_methods()
    if success:
        print("\n🎉 Supabase connection successful!")
    else:
        print("\n❌ All connection methods failed")
        print("💡 Suggestions:")
        print("1. Check if your network blocks IPv6")
        print("2. Try using a VPN")
        print("3. Use local PostgreSQL for now")
        print("4. Deploy to Supabase when network is fixed")
