---
layout: home
title: FAQ
nav_order: 6
---

# estela's Frequently Asked Questions  
Below you will find answers to the questions we get asked the most about different estela topics.  

## estela Installation
### Q: How do I restart the installation process?  
**Answer:** You may face problems if the installation guides are not followed in order. If you missed a critical step and
want to start over, you should remove all the deployed resources. If you are working with local resources, you can remove
them by running the following command in the installation folder:
```bash
$ make delete-resources
```
Look for the local docker images and delete them. Some docker volumes were created if you passed the [Helm deployment step]({% link estela/installation/installation.md %}#3-helm-deployment){:target="_blank"}.
Delete them too.
