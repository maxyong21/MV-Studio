import {useEffect} from 'react';

// Publish after page metadata effects. StrictMode cleanup cancels the first timer.
export default function Analytics({path,enabled}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.mvAnalyticsPage = enabled ? {path,title:document.title} : null;
      window.dispatchEvent(new Event('mv:analytics-page'));
    }, 0);
    return () => clearTimeout(timer);
  }, [path,enabled]);
  return null;
}
