# Offline Installation

Use the offline bundle and installation instructions supplied for your **exact
Kamiwaza release** on a supported RHEL-compatible 9.x x86_64 host.

:::warning Choose the bundle version before running commands
The documentation version in the navigation is not proof that an offline bundle
with the same version has been published. This page does not provide a verified
1.2.1 offline command sequence. Obtain the matching bundle and instructions from
your Kamiwaza representative before installing 1.2.1.

The previous commands on this page installed **1.2.0**, including its prerequisite
RPM, extension bundle, and dependency image overrides. They are preserved in the
[1.2.0 offline installation guide](/1.2.0/installation/offline_install).
Use that guide only when intentionally installing that exact 1.2.0 bundle.
Changing its version strings does not produce a verified 1.2.1 installer.
:::

If the host has normal outbound internet access, use
[Online Installation](online_install.md).

## Step 1: Obtain the matching release bundle

Ask your Kamiwaza representative for one complete release handoff containing:

| Required item | What it must identify |
| --- | --- |
| Release | Exact published version or immutable candidate identifier |
| Artifacts | Download location, complete filenames, checksums, and any split-part assembly instructions |
| Installer | The command sequence for that bundle format and supported host |
| Configuration | Required image tags/overrides, runtime, resource profile, and storage settings |
| Offline prerequisites | OS packages, GPU drivers if needed, and whether disconnected host bootstrap was tested |
| Extensions | Matching extension bundle and its installation/verification instructions |

Keep these items together. Do not combine an RPM, image map, extension archive,
or checksum from different releases. A release candidate must use its own
published artifact inventory; there is no default RC version to substitute.

`release_origination.md`, when supplied with the bundle, records source-artifact
hashes and build provenance. It does not by itself supply every dependency image
override or every distribution-added split part. Use the complete instructions
for the selected bundle rather than reconstructing missing values.

## Step 2: Check the actual filesystems

Review [System Requirements](system_requirements.md), then check the target host
before transferring large artifacts:

```bash
df -hT / /tmp /var/tmp /var/lib /opt
findmnt -T /var/lib
lsblk -f
```

Budget space for downloaded artifacts, reassembled archives, extracted files,
container images, cluster storage, and operational headroom on the filesystems
that actually hold them. A large total disk does not help when `/var` is a small
separate volume.

The **350 GB / 80G storage-image example belongs to the 1.2.0 recipe**; it is not
a verified requirement for every offline release. Use the storage settings and
peak-space requirements supplied with your selected bundle. Confirm hostname,
GPU-driver, and host-tool prerequisites from that same handoff.

## Step 3: Transfer, verify, and install

1. Download the complete artifact set on a connected staging machine.
2. Verify the supplied checksums and signatures as directed by the release's
   instructions; reassemble split artifacts if required and verify the results.
3. Transfer the complete verified set to the target and verify it there again.
4. Run the release's prerequisite and platform installation commands with your
   domain and initial administrator credentials. Follow its guidance for remote
   sessions and interrupted installs.
5. Complete the matching extension installation if extensions are included.

A fully air-gapped install requires all prerequisites to be available without
external repositories. Having platform images staged locally alone does not
establish that host bootstrap can run disconnected.

For an **existing deployment**, use the upgrade procedure for the intended source
and target versions. The [1.0.0-to-1.2.0 database runbook](../runbooks/core-database-upgrade-1.2.md)
is specific to that transition; it is not a general 1.2.1 upgrade recipe.

## Step 4: Verify the installed release

Use the verification commands supplied with the bundle to confirm:

- the running platform version matches the selected release;
- the cluster and core services are healthy;
- the configured browser URL opens and administrator sign-in works;
- bundled extensions have been imported, if included; and
- the release's documented basic application workflow succeeds.

Record the installed version, verified artifact checksums, browser URL, and
verification results. Continue to [Quickstart](../quickstart.md) for broader
workflow validation.
