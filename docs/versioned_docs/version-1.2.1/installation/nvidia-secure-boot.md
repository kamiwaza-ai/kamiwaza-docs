---
title: NVIDIA GPU Hosts with Secure Boot Enabled
sidebar_label: NVIDIA Secure Boot
drafted_by: ai
---

# NVIDIA GPU Hosts with Secure Boot Enabled

On a Linux host with UEFI Secure Boot enabled, the kernel refuses to load an unsigned NVIDIA driver module — `nvidia-smi` fails and the host appears to have no GPU. The historical workaround, disabling Secure Boot, fails the compliance baselines many regulated environments require. Kamiwaza supports keeping Secure Boot enabled by signing the NVIDIA kernel module with a per-host Machine Owner Key (MOK) that the firmware trusts, and automates everything except a single one-time console confirmation.

## Before you start

- An Ubuntu or Debian bare-metal GPU host with UEFI Secure Boot enabled. This flow is validated end-to-end on Ubuntu 22.04.
- The NVIDIA driver installed via apt as a DKMS package (for example `nvidia-driver-580-server-open` on Ubuntu). Drivers installed via the NVIDIA `.run` installer are not supported — see [Limitations](#limitations).
- Console access to the host (physical, BMC/IPMI KVM, or serial-over-LAN where the firmware exposes it). The one-time MOK enrollment is confirmed at the pre-boot console and cannot be done over SSH.

## Enable the automation

The Secure Boot signing automation ships default-off. Enable it for GPU hosts by setting the install variable `nvidia_secure_boot_enabled: true` for the install run — for example in the Ansible inventory `group_vars` for the GPU hosts, or as an extra variable on the playbook invocation:

```bash
ansible-playbook <install playbook> -e nvidia_secure_boot_enabled=true
```

When enabled, the automation verifies the driver is on the supported apt DKMS path, generates a per-host MOK, stages its enrollment, and configures DKMS to sign every built module with that key — so kernel and driver updates re-sign automatically with no recurring manual work. Non-NVIDIA hosts skip cleanly.

## One-time MOK enrollment (per host)

On a host whose MOK is not yet enrolled, the install run **fails deliberately** after staging the enrollment and prints a one-time password. That is expected — complete the console procedure, then re-run:

1. Run the install with `nvidia_secure_boot_enabled=true`. Record the one-time password from the failure message.
2. Reboot the host. The blue **MOK manager** screen appears before the OS boots. You have about 10 seconds to press a key — if it times out, the request stays pending; reboot again.
3. Select **Enroll MOK**, then **Continue**, then **Yes**.
4. Enter the one-time password from step 1.
5. Select **Reboot**.
6. Re-run the install. It verifies the module signature and `nvidia-smi`, and completes.

If the password was lost before confirmation, clear the pending request with `sudo mokutil --revoke-import` and re-run the install to stage a fresh one.

## Verify

```bash
# Secure Boot is enabled
mokutil --sb-state                      # → SecureBoot enabled

# The nvidia module is signed by the host MOK
modinfo -F signer nvidia                # → <host> Secure Boot Module Signature key

# Driver healthy
nvidia-smi
```

The automation performs the same checks on every run, so a converged host passes with no changes.

## Limitations

- **The console confirmation cannot be automated.** Enrolling a MOK requires a human at the pre-boot MOK manager prompt; this is UEFI design and no flag or remote API replaces it.
- **`.run`-installed drivers are not supported.** They bypass DKMS, so nothing re-signs the module on kernel updates. Remove the `.run` install (`sudo /usr/bin/nvidia-uninstall`) and install the apt DKMS driver instead.
- **Ubuntu/Debian-family only.** The flow relies on the distribution's `shim-signed` mechanism and apt DKMS packages. On other distributions, use distribution-signed drivers or the distribution's own MOK tooling.
- **Azure Trusted Launch VMs cannot complete MOK enrollment headlessly.** The platform provides no console path to the pre-boot MOK manager prompt. Prefer distribution-signed drivers there, or verify the available console facilities case by case.
- **Firmware key resets revoke enrollment.** Clearing Secure Boot keys in firmware drops the enrolled MOK; the automation detects this and stages enrollment again.
