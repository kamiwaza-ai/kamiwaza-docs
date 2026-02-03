# Data Connectors

Data connectors in Kamiwaza allow administrators to configure external data source connectors. Once configured, users can connect their accounts to access data from these services, enabling integration with Microsoft 365, Google Workspace, and other cloud services.

## Overview

External data connectors enable users to access their data from cloud services like Microsoft 365 and Google Workspace. Administrators configure the connector settings (such as Azure AD application registration for Microsoft 365), and then users can connect their personal or work accounts to access data from these services.

The connector configuration includes:

- **Service configuration**: Application credentials and settings required to connect to the external service
- **Access controls**: Permissions and scopes that determine what data users can access
- **Status tracking**: Whether the connector is configured and ready for users to connect their accounts

Connectors are managed through the Kamiwaza web UI at **Settings** → **Data Connectors**.

## Configuring a Connector

### Prerequisites

- Administrative access to the Kamiwaza platform
- Application credentials for the external service (e.g., Azure AD app registration for Microsoft 365)
- Knowledge of the service's authentication and API requirements

### Using the Web UI

1. Navigate to **Settings** → **Data Connectors**
2. You'll see available connector types:
   - **Microsoft 365** - Connect to SharePoint, OneDrive, Outlook, and Calendar
   - **Google Workspace** - Connect to Drive, Gmail, and Calendar (Coming Soon)
   - **Dropbox** - Connect to Dropbox storage
3. Click **Configure** on the connector you want to set up
4. Fill in the required configuration details:
   - For Microsoft 365: Azure AD application credentials (Client ID, Client Secret, Tenant ID)
   - Service-specific settings and permissions
5. Click **Save** to complete the configuration

Once configured, the connector status will show as "Configured" and users will be able to connect their accounts to access data from these services.

## Managing Connectors

### Viewing Connectors

In the **Settings** → **Data Connectors** page, you can view all available connector types. Each connector card shows:

- Connector name and logo
- Associated services (e.g., "SharePoint, OneDrive, Outlook, Calendar" for Microsoft 365)
- Configuration status ("Configured" or "Not configured")
- Availability status (some connectors may show "Coming Soon")

### Viewing Connector Configuration

Click on a configured connector to view its configuration details, including:

- Application credentials and settings (sensitive values are redacted)
- Configured permissions and scopes
- Connection status

### Updating a Connector

To update a connector's configuration:

1. Navigate to **Settings** → **Data Connectors**
2. Click **Configure** on the connector you want to update
3. Modify the configuration fields as needed:
   - Application credentials (Client ID, Client Secret, etc.)
   - Service-specific settings
   - Permissions and scopes
4. Click **Save** to apply changes

**Note**: Updating connector configuration may require users to reconnect their accounts if authentication settings change.

### Removing a Connector Configuration

To remove a connector configuration:

1. Navigate to **Settings** → **Data Connectors**
2. Click **Configure** on the connector
3. Click **Delete** to remove the configuration

**Warning**: Removing a connector configuration will disconnect all users who have connected their accounts. Users will need to reconnect after the connector is reconfigured.

## User Connection Flow

Once an administrator has configured a connector, users can connect their accounts:

1. Users navigate to their profile or data sources section
2. They see available connectors that have been configured by administrators
3. Users click to connect their account (e.g., "Connect Microsoft 365")
4. They are redirected to authenticate with the external service (OAuth flow)
5. After successful authentication, their account is connected and they can access data from that service

The connector configuration determines what permissions and data scopes are available to users when they connect their accounts.

## Security and Access Control

### Application Credentials

- **Secure Storage**: Application credentials (Client IDs, Client Secrets) are encrypted at rest
- **Credential Rotation**: Update the connector configuration in the UI to rotate application credentials when needed
- **Least Privilege**: Configure application permissions to request only the minimum scopes needed

### User Access

- **OAuth Authentication**: Users authenticate directly with the external service (Microsoft, Google, etc.) using OAuth
- **User-Level Permissions**: Each user's access is limited to their own account and the permissions they grant during the OAuth flow
- **Admin Control**: Administrators control which connectors are available to users, but users control which accounts they connect

### Data Access

- **Scoped Access**: Users can only access data from accounts they have connected
- **Permission Boundaries**: The connector configuration determines what permissions are requested from users during the OAuth flow
- **Data Isolation**: Each user's connected accounts and data are isolated from other users

## Connector Status

Each connector displays its configuration status:

- **Not configured**: The connector has not been set up yet. Administrators need to click **Configure** to set up the connector.
- **Configured**: The connector is ready for users to connect their accounts. Users will see this connector as available in their data sources.

View connector status on the **Settings** → **Data Connectors** page. The status indicator shows whether each connector type is configured and ready for use.

## Supported Connector Types

| Connector | Services | Status |
|-----------|----------|--------|
| **Microsoft 365** | SharePoint, OneDrive, Outlook, Calendar | Available |
| **Google Workspace** | Drive, Gmail, Calendar | Coming Soon |
| **Dropbox** | Dropbox storage | Coming Soon |

### Microsoft 365 Connector

The Microsoft 365 connector allows users to connect their Microsoft accounts to access:
- **SharePoint**: Document libraries and sites
- **OneDrive**: Personal file storage
- **Outlook**: Email messages
- **Calendar**: Calendar events and meetings

**Configuration Requirements**:
- Azure AD application registration
- Client ID and Client Secret
- Tenant ID (for single-tenant apps)
- Required API permissions configured in Azure AD

> Need a connector that isn't listed? Contact Kamiwaza Support to discuss roadmap status or professional-services extensions.

## Best Practices

1. **Application Registration**: Create dedicated Azure AD applications (or equivalent) for Kamiwaza connectors rather than reusing existing applications
2. **Principle of Least Privilege**: Request only the minimum API permissions needed for the connector's functionality
3. **Credential Security**: Store application credentials securely and rotate them regularly
4. **User Communication**: Inform users about what data and permissions will be requested before they connect their accounts
5. **Testing**: Test connector configuration with a test account before making it available to all users
6. **Documentation**: Document the required Azure AD permissions and configuration steps for your team
7. **Monitoring**: Regularly review which users have connected accounts and ensure connectors remain properly configured

## Troubleshooting

### Connector Configuration Fails

- Verify you have administrative access to the Kamiwaza platform
- Check that all required fields are provided (Client ID, Client Secret, etc.)
- Ensure application credentials are valid and not expired
- Verify the Azure AD application has the required permissions configured
- Review error messages in the UI for specific validation failures

### Users Cannot Connect Their Accounts

- Verify the connector shows as "Configured" in the admin interface
- Check that the OAuth redirect URIs are correctly configured in Azure AD (for Microsoft 365)
- Ensure the application credentials are still valid and haven't expired
- Verify network connectivity between Kamiwaza and the external service

### Authentication Errors

- Check that the Client ID and Client Secret are correct
- Verify the redirect URI in Azure AD matches Kamiwaza's callback URL
- Ensure the Azure AD application permissions are properly configured
- Check if the application requires admin consent for certain permissions

## Related Documentation

- [Distributed Data Engine](./data-engine.md) - Overview of the DDE ingestion framework
- [Data Catalog](./data-catalog.md) - Managing ingested datasets
- [Security](./security/) - Security and access control documentation
- [Observability](./observability.md) - Monitoring and logging
