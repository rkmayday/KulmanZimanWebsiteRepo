# kulmanziman.shop forwarder

Replaces the old kulmanziman.shop site with a permanent, page-for-page redirect to kulmanziman.com,
so search results for the old pages move over to the matching new pages.

Deploy (only once kulmanziman.com is Live):

    npm install
    whop apps deploy --app app_uSQNScwPPUo9Fo

Undo: redeploy the old build from the Whop dashboard (Versions) or `whop apps builds promote <build_id>`.
