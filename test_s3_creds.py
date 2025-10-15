#!/usr/bin/env python3
"""Test S3 credentials provided by user."""

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

def test_s3_credentials():
    """Test the S3 credentials."""
    access_key = "AKIARME3CJJSPUJ57OWP"
    secret_key = "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"
    region = "us-east-1"
    
    print(f"Testing S3 credentials...")
    print(f"Access Key: {access_key}")
    print(f"Secret Key: {secret_key[:8]}...")
    print(f"Region: {region}")
    print("-" * 50)
    
    try:
        # Create S3 client
        client = boto3.client(
            's3',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region
        )
        
        print("✓ S3 client created successfully")
        
        # Test 1: List buckets
        print("Testing list_buckets()...")
        response = client.list_buckets()
        buckets = response.get('Buckets', [])
        print(f"✓ Successfully listed {len(buckets)} buckets")
        
        if buckets:
            print("Available buckets:")
            for bucket in buckets[:5]:  # Show first 5 buckets
                print(f"  - {bucket['Name']} (created: {bucket['CreationDate']})")
            if len(buckets) > 5:
                print(f"  ... and {len(buckets) - 5} more")
        else:
            print("  No buckets found (this is normal for some accounts)")
        
        # Test 2: Check if we can access account info
        print("\nTesting get_caller_identity()...")
        try:
            sts_client = boto3.client(
                'sts',
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name=region
            )
            identity = sts_client.get_caller_identity()
            print(f"✓ Account ID: {identity.get('Account', 'Unknown')}")
            print(f"✓ User ARN: {identity.get('Arn', 'Unknown')}")
        except Exception as e:
            print(f"⚠ Could not get caller identity: {e}")
        
        print("\n" + "=" * 50)
        print("✅ S3 CREDENTIALS ARE VALID AND WORKING!")
        return True
        
    except NoCredentialsError:
        print("❌ No valid credentials provided")
        return False
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        print(f"❌ AWS Client Error: {error_code} - {error_message}")
        
        if error_code == 'InvalidAccessKeyId':
            print("   The access key ID is invalid")
        elif error_code == 'SignatureDoesNotMatch':
            print("   The secret access key is invalid")
        elif error_code == 'AccessDenied':
            print("   Access denied - credentials may be valid but lack permissions")
        
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    test_s3_credentials()