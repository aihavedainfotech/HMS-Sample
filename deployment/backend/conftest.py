import os
import pytest

# Provide simple fixtures for staff login tests.  These default to the
# seeded administrator account, but can be overridden via environment
# variables (useful if the database has different credentials).

@pytest.fixture
def staff_id():
    return os.environ.get('TEST_STAFF_ID', 'ADM001')

@pytest.fixture
def password():
    # seeded hash corresponds to plaintext 'password'
    return os.environ.get('TEST_STAFF_PASSWORD', 'password')

@pytest.fixture
def expected_role():
    return os.environ.get('TEST_STAFF_ROLE', 'Admin')
