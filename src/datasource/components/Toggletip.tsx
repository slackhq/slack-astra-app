import { css, cx } from '@emotion/css';
import { Placement } from '@popperjs/core';
import React, { useCallback, useEffect, useRef } from 'react';
import { usePopperTooltip } from 'react-popper-tooltip';

import { GrafanaTheme2, colorManipulator } from '@grafana/data';
import { Portal, IconButton, useStyles2 } from '@grafana/ui';

// NOTE: This is shamelessly copied from Grafana. For some reason it was merged into the Grafana 9.5 release,
// but isn't in the @grafana/ui 9.5 release. It's only in the @grafana/ui 10.x releases. So I just copied it over.
// Once we upgrade to 10.x, we should use the proper version.
// Link to the original code: https://github.com/grafana/grafana/tree/main/packages/grafana-ui/src/components/Toggletip

export function buildTooltipTheme(
  theme: GrafanaTheme2,
  tooltipBg: string,
  toggletipBorder: string,
  tooltipText: string,
  tooltipPadding: { topBottom: number; rightLeft: number }
) {
  return {
    arrow: css({
      height: '1rem',
      width: '1rem',
      position: 'absolute',
      pointerEvents: 'none',

      '&::before': {
        borderStyle: 'solid',
        content: '""',
        display: 'block',
        height: 0,
        margin: 'auto',
        width: 0,
      },

      '&::after': {
        borderStyle: 'solid',
        content: '""',
        display: 'block',
        height: 0,
        margin: 'auto',
        position: 'absolute',
        width: 0,
      },
    }),
    container: css({
      backgroundColor: tooltipBg,
      borderRadius: theme.shape.radius.default,
      border: `1px solid ${toggletipBorder}`,
      boxShadow: theme.shadows.z2,
      color: tooltipText,
      fontSize: theme.typography.bodySmall.fontSize,
      padding: theme.spacing(tooltipPadding.topBottom, tooltipPadding.rightLeft),
      transition: 'opacity 0.3s',
      zIndex: theme.zIndex.tooltip,
      maxWidth: '400px',
      overflowWrap: 'break-word',

      "&[data-popper-interactive='false']": {
        pointerEvents: 'none',
      },

      "&[data-popper-placement*='bottom'] > div[data-popper-arrow='true']": {
        left: 0,
        marginTop: '-7px',
        top: 0,

        '&::before': {
          borderColor: `transparent transparent ${toggletipBorder} transparent`,
          borderWidth: '0 8px 7px 8px',
          position: 'absolute',
          top: '-1px',
        },

        '&::after': {
          borderColor: `transparent transparent ${tooltipBg} transparent`,
          borderWidth: '0 8px 7px 8px',
        },
      },

      "&[data-popper-placement*='top'] > div[data-popper-arrow='true']": {
        bottom: 0,
        left: 0,
        marginBottom: '-14px',

        '&::before': {
          borderColor: `${toggletipBorder} transparent transparent transparent`,
          borderWidth: '7px 8px 0 7px',
          position: 'absolute',
          top: '1px',
        },

        '&::after': {
          borderColor: `${tooltipBg} transparent transparent transparent`,
          borderWidth: '7px 8px 0 7px',
        },
      },

      "&[data-popper-placement*='right'] > div[data-popper-arrow='true']": {
        left: 0,
        marginLeft: '-10px',

        '&::before': {
          borderColor: `transparent ${toggletipBorder} transparent transparent`,
          borderWidth: '7px 6px 7px 0',
        },

        '&::after': {
          borderColor: `transparent ${tooltipBg} transparent transparent`,
          borderWidth: '6px 7px 7px 0',
          left: '2px',
          top: '1px',
        },
      },

      "&[data-popper-placement*='left'] > div[data-popper-arrow='true']": {
        marginRight: '-11px',
        right: 0,

        '&::before': {
          borderColor: `transparent transparent transparent ${toggletipBorder}`,
          borderWidth: '7px 0 6px 7px',
        },

        '&::after': {
          borderColor: `transparent transparent transparent ${tooltipBg}`,
          borderWidth: '6px 0 5px 5px',
          left: '1px',
          top: '1px',
        },
      },

      code: {
        border: 'none',
        display: 'inline',
        background: colorManipulator.darken(tooltipBg, 0.1),
        color: tooltipText,
      },

      pre: {
        background: colorManipulator.darken(tooltipBg, 0.1),
        color: tooltipText,
      },

      a: {
        color: tooltipText,
        textDecoration: 'underline',
      },

      'a:hover': {
        textDecoration: 'none',
      },
    }),
    headerClose: css({
      color: theme.colors.text.secondary,
      position: 'absolute',
      right: theme.spacing(1),
      top: theme.spacing(1.5),
      backgroundColor: 'transparent',
      border: 0,
    }),
    header: css({
      paddingTop: theme.spacing(1),
      paddingBottom: theme.spacing(2),
    }),
    body: css({
      paddingTop: theme.spacing(1),
      paddingBottom: theme.spacing(1),
    }),
    footer: css({
      paddingTop: theme.spacing(2),
      paddingBottom: theme.spacing(1),
    }),
  };
}

/**
 * This API allows popovers to update Popper's position when e.g. popover content changes
 * update is delivered to content by react-popper.
 */
export interface ToggletipContentProps {
  update?: () => void;
}

export type ToggletipContent = string | React.ReactElement | (() => React.ReactElement);

export interface ToggletipProps {
  /** The theme used to display the toggletip */
  theme?: 'info' | 'error';
  /** The title to be displayed on the header */
  title?: JSX.Element | string;
  /** determine whether to show or not the close button **/
  closeButton?: boolean;
  /** Callback function to be called when the toggletip is closed */
  onClose?: Function;
  /** The preferred placement of the toggletip */
  placement?: Placement;
  /** The text or component that houses the content of the toggleltip */
  content: ToggletipContent;
  /** The text or component to be displayed on the toggletip's bottom */
  footer?: JSX.Element | string;
  /** The UI control users interact with to display toggletips */
  children: JSX.Element;
  /** Determine whether the toggletip should fit its content or not */
  fitContent?: boolean;
}

export const Toggletip = React.memo(
  ({
    children,
    theme = 'info',
    placement = 'auto',
    content,
    title,
    closeButton = true,
    onClose,
    footer,
    fitContent = false,
  }: ToggletipProps) => {
    const styles = useStyles2(getStyles);
    const style = styles[theme];
    const contentRef = useRef(null);
    const [controlledVisible, setControlledVisible] = React.useState(false);

    const closeToggletip = useCallback(() => {
      setControlledVisible(false);
      onClose?.();
    }, [onClose]);

    useEffect(() => {
      if (controlledVisible) {
        const handleKeyDown = (enterKey: KeyboardEvent) => {
          if (enterKey.key === 'Escape') {
            closeToggletip();
          }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
          document.removeEventListener('keydown', handleKeyDown);
        };
      }
      return undefined;
    }, [controlledVisible, closeToggletip]);

    const { getArrowProps, getTooltipProps, setTooltipRef, setTriggerRef, visible } = usePopperTooltip({
      visible: controlledVisible,
      placement: placement,
      interactive: true,
      offset: [0, 8],
      trigger: 'click',
      onVisibleChange: (value: boolean) => {
        setControlledVisible(value);
        if (!value) {
          onClose?.();
        }
      },
    });


    return (
      <>
        {React.cloneElement(children, {
          ref: setTriggerRef,
          tabIndex: 0,
        })}
        {visible && (
          <Portal>
            <div
              data-testid="toggletip-content"
              ref={setTooltipRef}
              {...getTooltipProps({ className: cx(style.container, fitContent && styles.fitContent) })}
            >
              {Boolean(title) && <div className={style.header}>{title}</div>}
              {closeButton && (
                <div className={style.headerClose}>
                  <IconButton
                    tooltip="Close"
                    name="times"
                    data-testid="toggletip-header-close"
                    onClick={closeToggletip}
                  />
                </div>
              )}
              <div ref={contentRef} {...getArrowProps({ className: style.arrow })} />
              <div className={style.body}>
                {(typeof content === 'function' && React.isValidElement(content())) && content()}
              </div>
              {Boolean(footer) && <div className={style.footer}>{footer}</div>}
            </div>
          </Portal>
        )}
      </>
    );
  }
);

Toggletip.displayName = 'Toggletip';

export const getStyles = (theme: GrafanaTheme2) => {
  const info = buildTooltipTheme(
    theme,
    theme.components.tooltip.background,
    theme.components.tooltip.background,
    theme.components.tooltip.text,
    { topBottom: 3, rightLeft: 3 }
  );
  const error = buildTooltipTheme(
    theme,
    theme.colors.error.main,
    theme.colors.error.main,
    theme.colors.error.contrastText,
    { topBottom: 3, rightLeft: 3 }
  );

  return {
    info,
    error,
    fitContent: css({
      maxWidth: 'fit-content',
    }),
  };
};
