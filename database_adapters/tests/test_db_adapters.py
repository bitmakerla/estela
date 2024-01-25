import pytest
from unittest.mock import Mock, patch
import pyodbc
from database_adapters.db_adapters import SqlServerWriterAdapter, InsertionResponse

class TestSqlServerWriterAdapter:

    @pytest.fixture
    def mock_pyodbc_connect(self):
        with patch('database_adapters.db_adapters.pyodbc.connect') as mock_connect:
            mock_connect.return_value.cursor.return_value.__enter__.return_value.execute = Mock()
            mock_connect.return_value.cursor.return_value.__enter__.return_value.executemany = Mock()
            yield mock_connect

    @pytest.fixture
    def writer_adapter(self, mock_pyodbc_connect):
        return SqlServerWriterAdapter("dummy_connection_string")

    def test_get_connection_success(self, writer_adapter):
        assert writer_adapter.get_connection() == True

    def test_get_connection_failure(self, mock_pyodbc_connect, writer_adapter):
        mock_pyodbc_connect.side_effect = Exception("Connection Error")
        assert writer_adapter.get_connection() == False

    def test_execute_query_success(self, writer_adapter):
        connection = writer_adapter.get_connection()
        assert writer_adapter._execute_query("test_db", "SELECT * FROM test_table") == (True, None)

    def test_execute_query_failure(self, mock_pyodbc_connect, writer_adapter):
        connection = writer_adapter.get_connection()
        mock_pyodbc_connect.return_value.cursor.side_effect = pyodbc.DatabaseError("Error")

        # Ejecutar la consulta y capturar el resultado
        result, error = writer_adapter._execute_query("test_db", "SELECT * FROM test_table")
        assert result == False
        assert isinstance(error, pyodbc.DatabaseError)
        assert str(error) == "Error"

    def test_execute_query_with_execute_many(self, writer_adapter):
        connection = writer_adapter.get_connection()
        assert writer_adapter._execute_query("test_db", "INSERT INTO test_table VALUES (?)", values=[(1,),(2,)], execute_many=True) == (True, None)

    def test_insert_one_to_dataset(self, writer_adapter):
        item = {"col1": "val1", "col2": "val2"}
        connection = writer_adapter.get_connection()
        response = writer_adapter.insert_one_to_dataset("test_db", "test_table", item)
        assert isinstance(response, InsertionResponse)
        assert response.ok == True

    def test_insert_many_to_dataset(self, writer_adapter):
        items = [{"col1": "val1", "col2": "val2"}, {"col1": "val3", "col2": "val4"}]
        connection = writer_adapter.get_connection()
        response = writer_adapter.insert_many_to_dataset("test_db", "test_table", items)
        assert isinstance(response, InsertionResponse)
        assert response.ok == True
        assert not response.error
        assert not response.need_upsert

    def test_delete_dataset_data(self, writer_adapter):
        connection = writer_adapter.get_connection()
        response = writer_adapter.delete_dataset_data("test_db", "test_table")
        assert response.ok == True
        assert not response.error
        assert not response.need_upsert

    def test_insert_one_to_unique_dataset(self, writer_adapter):
        connection = writer_adapter.get_connection()
        item = {"col1": "val1", "col2": "val2"}
        response = writer_adapter.insert_one_to_unique_dataset("test_db", "test_table", item)
        assert isinstance(response, InsertionResponse)
        assert response.ok == True
