from core.models import Project, Spider, SpiderJob
from rest_framework import serializers


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ('pid', 'name')


class SpiderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Spider
        fields = '__all__'
        read_only_fields = ('sid', 'pid')


class SpiderJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpiderJob
        fields = '__all__'
        read_only_fields = ('jid', 'sid', 'created', 'status')
