import {
  fetchAwsCredentialsFreshness,
  fetchPortForwards,
  startPortForward,
  type PortForwardSummary,
} from "../../../actions/portForwardActions.ts";

export const AWS_CREDENTIALS_FORWARD_ID = "aws-credentials-refresh";
export const CREDENTIALS_MAX_AGE_HOURS = 8;

const POLL_INTERVAL_MS = 1500;
const MAX_WAIT_MS = 15 * 60 * 1000;

type OnForwardsChange = (forwards: PortForwardSummary[]) => void;

async function waitForOneShotCompletion(
  id: string,
  onForwardsChange?: OnForwardsChange
): Promise<PortForwardSummary> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < MAX_WAIT_MS) {
    const latestForwards = await fetchPortForwards();
    onForwardsChange?.(latestForwards);

    const summary = latestForwards.find((forward) => forward.id === id);
    if (!summary) {
      throw new Error(`Missing command state for ${id}.`);
    }

    if (summary.status === "success") {
      return summary;
    }

    if (summary.status === "error") {
      throw new Error(`${summary.name} failed. Check logs for details.`);
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(() => resolve(), POLL_INTERVAL_MS);
    });
  }

  throw new Error("Timed out waiting for AWS credentials update to finish.");
}

/**
 * Refresh AWS credentials if stale, then start every persistent forward that
 * isn't already running. Optionally pushes intermediate state to a caller
 * (e.g. the Manage Port Forwards page) via `onForwardsChange`.
 */
export async function runStartupSequence(options: { onForwardsChange?: OnForwardsChange } = {}): Promise<PortForwardSummary[]> {
  const { onForwardsChange } = options;

  const freshness = await fetchAwsCredentialsFreshness(CREDENTIALS_MAX_AGE_HOURS);
  let currentForwards = await fetchPortForwards();
  onForwardsChange?.(currentForwards);

  const credentialsJob = currentForwards.find((forward) => forward.id === AWS_CREDENTIALS_FORWARD_ID);
  if (!credentialsJob) {
    throw new Error("Missing Update AWS Credentials command.");
  }

  if (!freshness.isFresh) {
    if (credentialsJob.status !== "running" && credentialsJob.status !== "starting") {
      await startPortForward(AWS_CREDENTIALS_FORWARD_ID);
    }

    await waitForOneShotCompletion(AWS_CREDENTIALS_FORWARD_ID, onForwardsChange);
    currentForwards = await fetchPortForwards();
    onForwardsChange?.(currentForwards);
  }

  for (const forward of currentForwards) {
    if (forward.id === AWS_CREDENTIALS_FORWARD_ID) continue;
    if (forward.runMode !== "persistent") continue;
    if (forward.status === "running" || forward.status === "starting") continue;

    await startPortForward(forward.id);
  }

  const refreshed = await fetchPortForwards();
  onForwardsChange?.(refreshed);
  return refreshed;
}
