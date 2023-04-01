<h1 align="center">Queueing</h1>

The project uses a Queue Platform cluster, currently Kafka, as its scheduler to transport scraped items into the database. The script `consumer.py`
was created to perform the task of transporting items from the Queue Platform to the database. For more information on this module
and how to set it up, please refer to our [official documentation](https://estela.bitmaker.la/docs/estela/queueing.html).
