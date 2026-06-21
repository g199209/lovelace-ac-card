import { LitElement, html, TemplateResult, css, PropertyValues, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import type { AcCardConfig } from './types';

console.info(
  `%c  LOVELACE-AC-CARD \n%c  v2.2.0  `,
  'color: #03a9f4; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'lovelace-ac-card',
  name: 'AC Card',
  description: 'Climate card with inline mode and fan controls',
});

// MDI paths (inlined to avoid import dependency)
const MDI_DOTS_VERTICAL =
  'M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z';
const MDI_MINUS = 'M19,13H5V11H19V13Z';
const MDI_PLUS = 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z';
const MDI_THERMOMETER =
  'M15 13.5V4a3 3 0 0 0-6 0v9.5a5 5 0 1 0 6 0M12 4a1 1 0 0 1 1 1v9.06A3 3 0 1 1 11 14.06V5a1 1 0 0 1 1-1z';

// CSS var chains mirror stateColorCss() output: --state-climate-{state}-color → --state-climate-{active|inactive}-color → --state-{active|inactive}-color
// Note: stateKey uses slugify(state, "_") which keeps underscores (e.g. fan_only → fan_only, not fan-only)
const HVAC_CFG: Record<string, { icon: string; label: string; color: string }> = {
  off: {
    icon: 'mdi:power',
    label: '关闭',
    color: 'var(--state-climate-off-color, var(--state-climate-inactive-color, var(--state-inactive-color, #9e9e9e)))',
  },
  cool: {
    icon: 'mdi:snowflake',
    label: '制冷',
    color: 'var(--state-climate-cool-color, var(--state-climate-active-color, var(--state-active-color, #2196f3)))',
  },
  heat: {
    icon: 'mdi:fire',
    label: '制热',
    color: 'var(--state-climate-heat-color, var(--state-climate-active-color, var(--state-active-color, #ff6f22)))',
  },
  fan_only: {
    icon: 'mdi:fan',
    label: '送风',
    color: 'var(--state-climate-fan_only-color, var(--state-climate-active-color, var(--state-active-color, #00bcd4)))',
  },
  dry: {
    icon: 'mdi:water-percent',
    label: '除湿',
    color: 'var(--state-climate-dry-color, var(--state-climate-active-color, var(--state-active-color, #ff9800)))',
  },
  auto: {
    icon: 'mdi:thermostat-auto',
    label: '自动',
    color: 'var(--state-climate-auto-color, var(--state-climate-active-color, var(--state-active-color, #4caf50)))',
  },
  heat_cool: {
    icon: 'mdi:thermometer',
    label: '自动冷热',
    color:
      'var(--state-climate-heat_cool-color, var(--state-climate-active-color, var(--state-active-color, #f59e0b)))',
  },
};

const FAN_LABELS: Record<string, string> = {
  auto: '自动',
  low: '低',
  low_medium: '中低',
  medium: '中',
  medium_high: '中高',
  high: '高',
  higher: '强',
  max: '最强',
};

// Maps climate mode → slider fill direction (matches official thermostat card logic)
const SLIDER_MODES: Record<string, string> = {
  cool: 'end',
  heat: 'start',
  off: 'full',
  auto: 'full',
  fan_only: 'full',
  dry: 'full',
  heat_cool: 'full',
};

@customElement('lovelace-ac-card')
export class LovelaceAcCard extends LitElement {
  public static getStubConfig(): Record<string, unknown> {
    return { entity: 'climate.example' };
  }

  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private config!: AcCardConfig;
  @state() private _pendingTemp?: number;

  public setConfig(config: AcCardConfig): void {
    if (!config.entity) throw new Error('entity is required');
    this.config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) return false;
    if (changedProps.has('config') || changedProps.has('hass')) return true;
    if (!this.hass) return false;
    const old = changedProps.get('hass') as HomeAssistant | undefined;
    // If hass not in changedProps (e.g. _pendingTemp changed), allow update
    if (!old) return true;
    return old.states[this.config.entity] !== this.hass.states[this.config.entity];
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this.config) return;
    const s = this.hass.states[this.config.entity];
    if (!s) return html`<ha-card><div class="err">Entity not found: ${this.config.entity}</div></ha-card>`;

    const name = this.config.name ?? (s.attributes.friendly_name as string) ?? this.config.entity;
    const mode = s.state;
    const curTemp = s.attributes.current_temperature as number | undefined;
    const tgtTemp = s.attributes.temperature as number | undefined;
    const minT = (s.attributes.min_temp as number | undefined) ?? 17;
    const maxT = (s.attributes.max_temp as number | undefined) ?? 30;
    const step = (s.attributes.target_temp_step as number | undefined) ?? 1;
    const fanMode = s.attributes.fan_mode as string | undefined;
    const fanModes = (s.attributes.fan_modes as string[] | undefined) ?? [];
    const isOff = mode === 'off';

    const cfg = HVAC_CFG[mode] ?? HVAC_CFG.off;
    const color = cfg.color;
    const sliderMode = SLIDER_MODES[mode] ?? 'full';
    const displayTemp = this._pendingTemp ?? tgtTemp;

    return html`
      <ha-card>
        <p class="title">${name}</p>
        <ha-icon-button
          class="more-info"
          .label=${'更多信息'}
          .path=${MDI_DOTS_VERTICAL}
          @click=${this._moreInfo}
        ></ha-icon-button>

        <!-- Arc section: mirrors official hui-thermostat-card layout -->
        <div class="container" style="--state-color: ${color}; --action-color: ${color}">
          <ha-control-circular-slider
            .inactive=${isOff}
            .mode=${sliderMode}
            .value=${displayTemp}
            .min=${minT}
            .max=${maxT}
            .step=${step}
            .current=${curTemp}
            @value-changed=${this._onValueChanged}
            @value-changing=${this._onValueChanging}
          ></ha-control-circular-slider>
          <div class="info">
            <button class="label" @click=${this._togglePower} title="点击开关机">${cfg.label}</button>
            ${displayTemp !== undefined
              ? html`<ha-big-number .value=${displayTemp} .unit=${'°C'}></ha-big-number>`
              : html`<p class="na">—</p>`}
            ${curTemp !== undefined
              ? html` <p class="secondary">
                  <ha-svg-icon .path=${MDI_THERMOMETER}></ha-svg-icon>
                  ${curTemp}°C
                </p>`
              : nothing}
          </div>
          <div class="buttons">
            <ha-outlined-icon-button @click=${() => this._adjust(-step)} ?disabled=${isOff || tgtTemp === undefined}>
              <ha-svg-icon .path=${MDI_MINUS}></ha-svg-icon>
            </ha-outlined-icon-button>
            <ha-outlined-icon-button @click=${() => this._adjust(step)} ?disabled=${isOff || tgtTemp === undefined}>
              <ha-svg-icon .path=${MDI_PLUS}></ha-svg-icon>
            </ha-outlined-icon-button>
          </div>
        </div>

        <!-- Fan control -->
        <div class="controls">${fanModes.length > 0 ? this._renderFan(fanMode, fanModes, isOff) : nothing}</div>
      </ha-card>
    `;
  }

  private _renderFan(fanMode: string | undefined, fanModes: string[], isOff: boolean): TemplateResult {
    const spinning = !isOff && fanMode === 'auto';
    return html`
      <div class="fan-row ${isOff ? 'fan-off' : ''}">
        <ha-icon icon="mdi:fan" class="fan-icon ${spinning ? 'spin' : ''}"></ha-icon>
        <div class="fan-chips">
          ${fanModes.map(
            (m) => html`
              <button
                class="fan-chip ${!isOff && m === fanMode ? 'active' : ''}"
                ?disabled=${isOff}
                @click=${() => this._setFan(m)}
              >
                ${FAN_LABELS[m] ?? m}
              </button>
            `,
          )}
        </div>
      </div>
    `;
  }

  private _onValueChanging(e: CustomEvent): void {
    const val = (e as any).detail?.value;
    if (typeof val === 'number' && !isNaN(val)) {
      this._pendingTemp = val;
    }
  }

  private _onValueChanged(e: CustomEvent): void {
    const temp = (e as any).detail?.value as number;
    this._pendingTemp = undefined;
    if (typeof temp === 'number' && !isNaN(temp)) {
      this.hass.callService('climate', 'set_temperature', {
        entity_id: this.config.entity,
        temperature: temp,
      });
    }
  }

  private _adjust(delta: number): void {
    const s = this.hass.states[this.config.entity];
    const cur = s?.attributes.temperature as number | undefined;
    if (cur === undefined) return;
    const min = (s?.attributes.min_temp as number | undefined) ?? 17;
    const max = (s?.attributes.max_temp as number | undefined) ?? 30;
    const next = Math.max(min, Math.min(max, cur + delta));
    this.hass.callService('climate', 'set_temperature', {
      entity_id: this.config.entity,
      temperature: next,
    });
  }

  private _togglePower(): void {
    const s = this.hass.states[this.config.entity];
    // Power is decoupled from mode: turning on lets the integration pick the
    // seasonal mode (heat in winter, cool otherwise). Mode is never set here.
    const service = s?.state === 'off' ? 'turn_on' : 'turn_off';
    this.hass.callService('climate', service, {
      entity_id: this.config.entity,
    });
  }

  private _setFan(m: string): void {
    this.hass.callService('climate', 'set_fan_mode', {
      entity_id: this.config.entity,
      fan_mode: m,
    });
  }

  private _moreInfo(): void {
    const ev = new Event('hass-more-info', { bubbles: true, composed: true });
    (ev as any).detail = { entityId: this.config.entity };
    this.dispatchEvent(ev);
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        height: 100%;
      }

      ha-card {
        position: relative;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .title {
        width: 100%;
        text-align: center;
        padding: 8px 40px;
        margin: 0;
        font-size: var(--ha-font-size-l, 16px);
        box-sizing: border-box;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: none;
      }

      .more-info {
        position: absolute;
        top: 0;
        right: 0;
        inset-inline-end: 0;
        inset-inline-start: initial;
        color: var(--secondary-text-color);
        border-radius: var(--ha-border-radius-pill, 50%);
      }

      /* ── Arc container (mirrors hui-thermostat-card .container) ── */
      .container {
        position: relative;
        width: 100%;
        max-width: 320px;
        box-sizing: border-box;
        overflow: hidden;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .container::before {
        content: '';
        display: block;
        padding-top: 100%;
      }
      .container > * {
        padding: 8px;
      }

      ha-control-circular-slider {
        width: 100%;
        display: block;
        --control-circular-slider-color: var(--state-color, var(--disabled-color));
      }

      .info {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        gap: var(--ha-space-2, 8px);
        font-size: var(--ha-font-size-l, 16px);
        line-height: var(--ha-line-height-normal, 1.5);
        letter-spacing: 0.1px;
        --mdc-icon-size: 16px;
      }
      .info > * {
        pointer-events: auto;
        margin: 0;
      }

      /* Clickable status text doubles as the power toggle */
      .label {
        font: inherit;
        font-weight: var(--ha-font-weight-medium, 500);
        color: var(--action-color, inherit);
        transition:
          color 0.3s,
          opacity 0.2s;
        text-align: center;
        width: 60%;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        background: none;
        border: none;
        padding: 2px 6px;
        cursor: pointer;
        border-radius: var(--ha-border-radius-pill, 999px);
      }
      .label:hover {
        opacity: 0.7;
      }

      ha-big-number {
        pointer-events: auto;
      }

      .na {
        font-size: 36px;
        margin: 0;
      }

      .secondary {
        font-size: var(--ha-font-size-l, 16px);
        color: var(--action-color, inherit);
        display: flex;
        align-items: center;
        gap: 2px;
        direction: ltr;
        margin: 0;
      }

      /* Radial glow behind the arc (mirrors stateControlCircularSliderStyle) */
      ha-control-circular-slider::after {
        display: block;
        content: '';
        position: absolute;
        top: -10%;
        left: -10%;
        right: -10%;
        bottom: -10%;
        background: radial-gradient(50% 50% at 50% 50%, var(--action-color, transparent) 0%, transparent 100%);
        opacity: 0.15;
        pointer-events: none;
      }

      .buttons {
        position: absolute;
        bottom: 10px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        gap: var(--ha-space-6, 24px);
        pointer-events: none;
      }
      .buttons > * {
        pointer-events: auto;
      }

      .buttons ha-outlined-icon-button {
        --md-outlined-icon-button-container-width: 48px;
        --md-outlined-icon-button-container-height: 48px;
        --md-outlined-icon-button-icon-size: 24px;
      }

      /* ── Bottom controls ─────────────────────────────── */
      .controls {
        width: 100%;
        padding: 0 12px 12px;
        box-sizing: border-box;
        flex: none;
      }

      /* ── Fan row ─────────────────────────────────────── */
      .fan-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding-top: 8px;
        border-top: 1px solid var(--divider-color);
        margin-top: 4px;
        transition: opacity 0.2s;
      }
      .fan-row.fan-off {
        opacity: 0.45;
      }

      .fan-icon {
        --mdc-icon-size: 20px;
        color: var(--secondary-text-color);
        flex-shrink: 0;
      }
      .fan-icon.spin {
        animation: spin 2s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .fan-chips {
        flex: 1;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .fan-chip {
        padding: 3px 10px;
        border: 1.5px solid var(--divider-color);
        border-radius: 99px;
        background: none;
        color: var(--secondary-text-color);
        font-size: 12px;
        cursor: pointer;
        transition:
          border-color 0.2s,
          color 0.2s,
          background 0.2s;
        white-space: nowrap;
      }
      .fan-chip:hover:not(:disabled):not(.active) {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }
      .fan-chip.active {
        border-color: var(--action-color, var(--primary-color));
        color: var(--action-color, var(--primary-color));
        background: var(--secondary-background-color);
        font-weight: 600;
      }
      .fan-chip:disabled {
        cursor: default;
      }

      .err {
        padding: 16px;
        color: var(--error-color, red);
      }
    `;
  }
}
