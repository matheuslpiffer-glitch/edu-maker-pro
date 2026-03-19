import { useEffect } from 'react';

/**
 * If the user is on educreatorpro.com (without www), redirect to www.educreatorpro.com.
 * This ensures canonical URL consistency and avoids localStorage split.
 */
export default function WwwRedirect() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.location.hostname === 'educreatorpro.com'
    ) {
      window.location.replace(
        `https://www.educreatorpro.com${window.location.pathname}${window.location.search}${window.location.hash}`
      );
    }
  }, []);

  return null;
}
