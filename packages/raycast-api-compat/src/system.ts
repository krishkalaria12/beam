import {
  captureException as beamCaptureException,
  getApplications as beamGetApplications,
  getDefaultApplication as beamGetDefaultApplication,
  getFrontmostApplication as beamGetFrontmostApplication,
  showInFinder as beamShowInFinder,
} from "@beam/api";

export const getApplications = beamGetApplications;
export const getDefaultApplication = beamGetDefaultApplication;
export const getFrontmostApplication = beamGetFrontmostApplication;
export const showInFinder = beamShowInFinder;
export const captureException = beamCaptureException;
