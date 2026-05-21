export const JOB_FIELD_HELP = {
    spider: "The spider to run. Each project can have multiple spiders, one per scraping target.",

    persistence:
        "How long the items extracted by this job will be retained before being deleted. " +
        "Choose 'Forever' to keep them indefinitely.",

    tier:
        "CPU and memory allocated to this job. Higher tiers run faster but consume more " +
        "credits. DEFAULT is fine for most spiders.",

    args:
        "Command-line arguments passed to your spider on start (e.g. start_url=https://example.com). " +
        "Available in the spider via self.<name>.",

    envProject:
        "Variables defined at the project level. They are inherited by every job, in every " +
        "spider of this project.",

    envSpider:
        "Variables defined on this spider. They are inherited by every job of this spider " +
        "and override project variables.",

    envJob:
        "Variables for this job only. They override spider and project variables. Use the " +
        "eye icon to mask sensitive values like API keys.",

    proxy: "Route this job's requests through a proxy server. Useful for IP rotation or " + "geo-targeted scraping.",

    tags:
        "Labels for organizing and filtering jobs later (e.g. 'production', 'monitoring'). " +
        "Pure metadata, no behaviour change.",
};
