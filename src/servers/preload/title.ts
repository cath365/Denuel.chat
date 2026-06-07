import { dispatch } from '../../store';
import { BRAND_NAME } from '../../brand';
import { WEBVIEW_TITLE_CHANGED } from '../../ui/actions';
import { getServerUrl } from './urls';

export const setTitle = (title: string): void => {
  if (typeof title !== 'string') {
    return;
  }

  const url = getServerUrl();

  if (title === BRAND_NAME) {
    dispatch({
      type: WEBVIEW_TITLE_CHANGED,
      payload: {
        url,
        title: `${title} - ${url}`,
      },
    });
    return;
  }

  dispatch({
    type: WEBVIEW_TITLE_CHANGED,
    payload: {
      url,
      title,
    },
  });
};
