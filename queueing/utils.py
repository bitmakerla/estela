# https://stackoverflow.com/questions/12397118/mongodb-dot-in-key-name
def jsonify(item):
    new_item = {}
    if type(item) is dict:
        for key, value in item.items():
            new_key = key.replace(".", "\\u002e")
            if type(value) is dict:
                new_item[new_key] = jsonify(value)
            elif type(value) is list:
                new_item[new_key] = [jsonify(x) for x in value]
            else:
                new_item[new_key] = item[key]
        return new_item
    else:
        return item
