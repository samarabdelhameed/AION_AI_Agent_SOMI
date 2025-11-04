/**
 * User-friendly error messaging system
 * Converts technical errors to user-friendly messages with actionable suggestions
 */

import {
  TransactionError,
  TransactionErrorType,
  ERROR_CODES,
  ErrorCode
} from './types';

/**
 * Language codes supported by the messaging system
 */
export type LanguageCode = 'en' | 'ar' | 'es' | 'fr' | 'de' | 'zh';

/**
 * Message template interface for localization
 */
export interface MessageTemplate {
  title: string;
  message: string;
  suggestions: string[];
  learnMoreUrl?: string;
}

/**
 * Localized message templates
 */
export interface LocalizedMessages {
  [key: string]: {
    [lang in LanguageCode]: MessageTemplate;
  };
}

/**
 * Message generation options
 */
export interface MessageOptions {
  language?: LanguageCode;
  includeDetails?: boolean;
  maxSuggestions?: number;
  customContext?: Record<string, any>;
}

/**
 * Generated user message
 */
export interface UserMessage {
  title: string;
  message: string;
  suggestions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  learnMoreUrl?: string;
  canRetry: boolean;
  estimatedFixTime?: string;
}

/**
 * Message generator class for creating user-friendly error messages
 */
export class MessageGenerator {
  private messages: LocalizedMessages;
  private defaultLanguage: LanguageCode = 'en';

  constructor(customMessages?: Partial<LocalizedMessages>) {
    this.messages = { ...DEFAULT_MESSAGES, ...customMessages };
  }

  /**
   * Generate user-friendly message from transaction error
   */
  generateMessage(
    error: TransactionError,
    options: MessageOptions = {}
  ): UserMessage {
    const {
      language = this.defaultLanguage,
      includeDetails = false,
      maxSuggestions = 3,
      customContext = {}
    } = options;

    const template = this.getMessageTemplate(error.code, language);
    const dynamicContent = this.buildDynamicContent(error, customContext);

    return {
      title: this.interpolateMessage(template.title, dynamicContent),
      message: this.interpolateMessage(template.message, dynamicContent),
      suggestions: template.suggestions
        .slice(0, maxSuggestions)
        .map(suggestion => this.interpolateMessage(suggestion, dynamicContent)),
      severity: this.mapSeverity(error.severity),
      learnMoreUrl: template.learnMoreUrl,
      canRetry: error.retryable,
      estimatedFixTime: this.getEstimatedFixTime(error)
    };
  }

  /**
   * Generate quick error message for notifications
   */
  generateQuickMessage(error: TransactionError, language?: LanguageCode): string {
    const template = this.getMessageTemplate(error.code, language || this.defaultLanguage);
    const dynamicContent = this.buildDynamicContent(error);
    return this.interpolateMessage(template.message, dynamicContent);
  }

  /**
   * Get all available suggestions for an error
   */
  getAllSuggestions(error: TransactionError, language?: LanguageCode): string[] {
    const template = this.getMessageTemplate(error.code, language || this.defaultLanguage);
    const dynamicContent = this.buildDynamicContent(error);
    return template.suggestions.map(suggestion => 
      this.interpolateMessage(suggestion, dynamicContent)
    );
  }

  /**
   * Set default language for message generation
   */
  setDefaultLanguage(language: LanguageCode): void {
    this.defaultLanguage = language;
  }

  /**
   * Add or update message templates
   */
  updateMessages(messages: Partial<LocalizedMessages>): void {
    this.messages = { ...this.messages, ...messages };
  }

  /**
   * Get message template for error code and language
   */
  private getMessageTemplate(code: ErrorCode, language: LanguageCode): MessageTemplate {
    const errorMessages = this.messages[code];
    if (!errorMessages) {
      return this.messages[ERROR_CODES.UNKNOWN_ERROR][language];
    }

    return errorMessages[language] || errorMessages[this.defaultLanguage];
  }

  /**
   * Build dynamic content for message interpolation
   */
  private buildDynamicContent(
    error: TransactionError,
    customContext: Record<string, any> = {}
  ): Record<string, string> {
    const { context } = error;
    
    return {
      amount: context.amount ? this.formatAmount(context.amount) : '0',
      chainName: this.getChainName(context.chainId),
      gasPrice: context.gasPrice ? this.formatGasPrice(context.gasPrice) : 'unknown',
      blockNumber: context.blockNumber?.toString() || 'unknown',
      txHash: context.txHash ? this.formatTxHash(context.txHash) : '',
      userAddress: context.userAddress ? this.formatAddress(context.userAddress) : '',
      vaultAddress: this.formatAddress(context.vaultAddress),
      ...customContext
    };
  }

  /**
   * Interpolate message template with dynamic content
   */
  private interpolateMessage(template: string, content: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return content[key] || match;
    });
  }

  /**
   * Map error severity to user message severity
   */
  private mapSeverity(severity: string): 'low' | 'medium' | 'high' | 'critical' {
    return severity as 'low' | 'medium' | 'high' | 'critical';
  }

  /**
   * Get estimated fix time for error
   */
  private getEstimatedFixTime(error: TransactionError): string | undefined {
    switch (error.type) {
      case TransactionErrorType.NETWORK:
        return '1-2 minutes';
      case TransactionErrorType.GAS:
        return '30 seconds';
      case TransactionErrorType.USER:
        return 'Immediate';
      case TransactionErrorType.CONTRACT:
        return 'May require developer fix';
      default:
        return undefined;
    }
  }

  /**
   * Format amount for display
   */
  private formatAmount(amount: bigint): string {
    const eth = Number(amount) / 1e18;
    return eth.toFixed(4) + ' BNB';
  }

  /**
   * Format gas price for display
   */
  private formatGasPrice(gasPrice: bigint): string {
    const gwei = Number(gasPrice) / 1e9;
    return gwei.toFixed(2) + ' Gwei';
  }

  /**
   * Format transaction hash for display
   */
  private formatTxHash(txHash: string): string {
    return `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
  }

  /**
   * Format address for display
   */
  private formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Get chain name from chain ID
   */
  private getChainName(chainId: number): string {
    const chainNames: Record<number, string> = {
      1: 'Ethereum',
      56: 'BSC',
      137: 'Polygon',
      43114: 'Avalanche',
      250: 'Fantom',
      42161: 'Arbitrum',
      10: 'Optimism'
    };
    return chainNames[chainId] || `Chain ${chainId}`;
  }
}

/**
 * Default message templates for common errors
 */
const DEFAULT_MESSAGES: LocalizedMessages = {
  [ERROR_CODES.INSUFFICIENT_FUNDS]: {
    en: {
      title: 'Insufficient Balance',
      message: 'You don\'t have enough BNB to complete this transaction. You need {{amount}} but your balance is lower.',
      suggestions: [
        'Add more BNB to your wallet',
        'Reduce the deposit amount',
        'Check if you have enough for gas fees'
      ],
      learnMoreUrl: 'https://docs.example.com/insufficient-funds'
    },
    ar: {
      title: 'Insufficient Balance',
      message: 'You do not have enough BNB to complete this transaction. You need {{amount}} but your balance is lower.',
      suggestions: [
        'Add more BNB to your wallet',
        'Reduce the deposit amount',
        'Make sure you have enough balance for gas fees'
      ]
    },
    es: {
      title: 'Saldo Insuficiente',
      message: 'No tienes suficiente BNB para completar esta transacción. Necesitas {{amount}} pero tu saldo es menor.',
      suggestions: [
        'Añade más BNB a tu billetera',
        'Reduce la cantidad del depósito',
        'Verifica que tengas suficiente para las tarifas de gas'
      ]
    },
    fr: {
      title: 'Solde Insuffisant',
      message: 'Vous n\'avez pas assez de BNB pour compléter cette transaction. Vous avez besoin de {{amount}} mais votre solde est inférieur.',
      suggestions: [
        'Ajoutez plus de BNB à votre portefeuille',
        'Réduisez le montant du dépôt',
        'Vérifiez que vous avez assez pour les frais de gas'
      ]
    },
    de: {
      title: 'Unzureichendes Guthaben',
      message: 'Sie haben nicht genug BNB, um diese Transaktion abzuschließen. Sie benötigen {{amount}}, aber Ihr Guthaben ist niedriger.',
      suggestions: [
        'Fügen Sie mehr BNB zu Ihrer Wallet hinzu',
        'Reduzieren Sie den Einzahlungsbetrag',
        'Prüfen Sie, ob Sie genug für Gasgebühren haben'
      ]
    },
    zh: {
      title: '余额不足',
      message: '您没有足够的BNB来完成此交易。您需要{{amount}}，但您的余额较低。',
      suggestions: [
        '向您的钱包添加更多BNB',
        '减少存款金额',
        '检查您是否有足够的gas费用'
      ]
    }
  },

  [ERROR_CODES.USER_REJECTED]: {
    en: {
      title: 'Transaction Cancelled',
      message: 'You cancelled the transaction in your wallet. No funds were transferred.',
      suggestions: [
        'Try the transaction again if you want to proceed',
        'Check the transaction details before confirming',
        'Make sure you want to complete this action'
      ]
    },
    ar: {
      title: 'Transaction Cancelled',
      message: 'You cancelled the transaction in your wallet. No funds were transferred.',
      suggestions: [
        'Try the transaction again if you want to proceed',
        'Check transaction details before confirming',
        'Make sure you want to complete this action'
      ]
    },
    es: {
      title: 'Transacción Cancelada',
      message: 'Cancelaste la transacción en tu billetera. No se transfirieron fondos.',
      suggestions: [
        'Intenta la transacción nuevamente si quieres proceder',
        'Revisa los detalles de la transacción antes de confirmar',
        'Asegúrate de que quieres completar esta acción'
      ]
    },
    fr: {
      title: 'Transaction Annulée',
      message: 'Vous avez annulé la transaction dans votre portefeuille. Aucun fonds n\'a été transféré.',
      suggestions: [
        'Essayez à nouveau la transaction si vous voulez continuer',
        'Vérifiez les détails de la transaction avant de confirmer',
        'Assurez-vous que vous voulez compléter cette action'
      ]
    },
    de: {
      title: 'Transaktion Abgebrochen',
      message: 'Sie haben die Transaktion in Ihrer Wallet abgebrochen. Es wurden keine Gelder übertragen.',
      suggestions: [
        'Versuchen Sie die Transaktion erneut, wenn Sie fortfahren möchten',
        'Überprüfen Sie die Transaktionsdetails vor der Bestätigung',
        'Stellen Sie sicher, dass Sie diese Aktion abschließen möchten'
      ]
    },
    zh: {
      title: '交易已取消',
      message: '您在钱包中取消了交易。没有资金被转移。',
      suggestions: [
        '如果您想继续，请再次尝试交易',
        '确认前检查交易详情',
        '确保您想要完成此操作'
      ]
    }
  },

  [ERROR_CODES.NETWORK_TIMEOUT]: {
    en: {
      title: 'Network Timeout',
      message: 'The {{chainName}} network is taking longer than expected to respond. This is usually temporary.',
      suggestions: [
        'Wait a moment and try again',
        'Check your internet connection',
        'Try switching to a different RPC endpoint'
      ]
    },
    ar: {
      title: 'Network Timeout',
      message: 'Network {{chainName}} is taking longer than expected to respond. This is usually temporary.',
      suggestions: [
        'Wait a moment and try again',
        'Check your internet connection',
        'Try switching to a different RPC endpoint'
      ]
    },
    es: {
      title: 'Tiempo de Espera de Red Agotado',
      message: 'La red {{chainName}} está tardando más de lo esperado en responder. Esto suele ser temporal.',
      suggestions: [
        'Espera un momento e intenta de nuevo',
        'Verifica tu conexión a internet',
        'Intenta cambiar a un endpoint RPC diferente'
      ]
    },
    fr: {
      title: 'Délai d\'Attente Réseau',
      message: 'Le réseau {{chainName}} prend plus de temps que prévu pour répondre. C\'est généralement temporaire.',
      suggestions: [
        'Attendez un moment et réessayez',
        'Vérifiez votre connexion internet',
        'Essayez de passer à un endpoint RPC différent'
      ]
    },
    de: {
      title: 'Netzwerk-Timeout',
      message: 'Das {{chainName}}-Netzwerk braucht länger als erwartet, um zu antworten. Das ist normalerweise vorübergehend.',
      suggestions: [
        'Warten Sie einen Moment und versuchen Sie es erneut',
        'Überprüfen Sie Ihre Internetverbindung',
        'Versuchen Sie, zu einem anderen RPC-Endpunkt zu wechseln'
      ]
    },
    zh: {
      title: '网络超时',
      message: '{{chainName}}网络响应时间比预期长。这通常是暂时的。',
      suggestions: [
        '等待片刻后重试',
        '检查您的网络连接',
        '尝试切换到不同的RPC端点'
      ]
    }
  },

  [ERROR_CODES.GAS_TOO_LOW]: {
    en: {
      title: 'Gas Price Too Low',
      message: 'The gas price of {{gasPrice}} is too low for current network conditions. Your transaction may be stuck.',
      suggestions: [
        'Increase the gas price to speed up the transaction',
        'Wait for network congestion to decrease',
        'Cancel and retry with higher gas price'
      ]
    },
    ar: {
      title: 'Gas Price Too Low',
      message: 'Gas price {{gasPrice}} is too low for current network conditions. Your transaction may get stuck.',
      suggestions: [
        'Increase gas price to speed up transaction',
        'Wait for network congestion to decrease',
        'Cancel and retry with higher gas price'
      ]
    },
    es: {
      title: 'Precio de Gas Muy Bajo',
      message: 'El precio de gas de {{gasPrice}} es muy bajo para las condiciones actuales de la red. Tu transacción puede quedarse atascada.',
      suggestions: [
        'Aumenta el precio de gas para acelerar la transacción',
        'Espera a que disminuya la congestión de la red',
        'Cancela y reintenta con un precio de gas más alto'
      ]
    },
    fr: {
      title: 'Prix du Gas Trop Bas',
      message: 'Le prix du gas de {{gasPrice}} est trop bas pour les conditions actuelles du réseau. Votre transaction peut être bloquée.',
      suggestions: [
        'Augmentez le prix du gas pour accélérer la transaction',
        'Attendez que la congestion du réseau diminue',
        'Annulez et réessayez avec un prix de gas plus élevé'
      ]
    },
    de: {
      title: 'Gaspreis Zu Niedrig',
      message: 'Der Gaspreis von {{gasPrice}} ist zu niedrig für die aktuellen Netzwerkbedingungen. Ihre Transaktion könnte hängen bleiben.',
      suggestions: [
        'Erhöhen Sie den Gaspreis, um die Transaktion zu beschleunigen',
        'Warten Sie, bis die Netzwerküberlastung abnimmt',
        'Abbrechen und mit höherem Gaspreis erneut versuchen'
      ]
    },
    zh: {
      title: 'Gas价格过低',
      message: '{{gasPrice}}的gas价格对于当前网络条件来说太低了。您的交易可能会卡住。',
      suggestions: [
        '提高gas价格以加速交易',
        '等待网络拥堵减少',
        '取消并以更高的gas价格重试'
      ]
    }
  },

  [ERROR_CODES.CONTRACT_REVERT]: {
    en: {
      title: 'Transaction Failed',
      message: 'The smart contract rejected your transaction. This could be due to invalid parameters or contract conditions.',
      suggestions: [
        'Check if you meet all requirements for this action',
        'Verify the transaction parameters are correct',
        'Contact support if the issue persists'
      ]
    },
    ar: {
      title: 'Transaction Failed',
      message: 'Smart contract rejected your transaction. This may be due to incorrect parameters or contract conditions.',
      suggestions: [
        'Check that you meet all requirements for this action',
        'Verify transaction parameters are correct',
        'Contact support if the problem persists'
      ]
    },
    es: {
      title: 'Transacción Fallida',
      message: 'El contrato inteligente rechazó tu transacción. Esto podría deberse a parámetros inválidos o condiciones del contrato.',
      suggestions: [
        'Verifica si cumples todos los requisitos para esta acción',
        'Confirma que los parámetros de la transacción son correctos',
        'Contacta soporte si el problema persiste'
      ]
    },
    fr: {
      title: 'Transaction Échouée',
      message: 'Le contrat intelligent a rejeté votre transaction. Cela pourrait être dû à des paramètres invalides ou aux conditions du contrat.',
      suggestions: [
        'Vérifiez si vous remplissez toutes les exigences pour cette action',
        'Vérifiez que les paramètres de transaction sont corrects',
        'Contactez le support si le problème persiste'
      ]
    },
    de: {
      title: 'Transaktion Fehlgeschlagen',
      message: 'Der Smart Contract hat Ihre Transaktion abgelehnt. Dies könnte an ungültigen Parametern oder Vertragsbedingungen liegen.',
      suggestions: [
        'Überprüfen Sie, ob Sie alle Anforderungen für diese Aktion erfüllen',
        'Stellen Sie sicher, dass die Transaktionsparameter korrekt sind',
        'Kontaktieren Sie den Support, wenn das Problem weiterhin besteht'
      ]
    },
    zh: {
      title: '交易失败',
      message: '智能合约拒绝了您的交易。这可能是由于无效参数或合约条件造成的。',
      suggestions: [
        '检查您是否满足此操作的所有要求',
        '验证交易参数是否正确',
        '如果问题持续存在，请联系支持'
      ]
    }
  },

  [ERROR_CODES.UNKNOWN_ERROR]: {
    en: {
      title: 'Unexpected Error',
      message: 'An unexpected error occurred while processing your transaction. Our team has been notified.',
      suggestions: [
        'Try the transaction again in a few minutes',
        'Check if the issue is resolved',
        'Contact support with transaction details'
      ]
    },
    ar: {
      title: 'Unexpected Error',
      message: 'An unexpected error occurred while processing your transaction. Our team has been notified.',
      suggestions: [
        'Try the transaction again in a few minutes',
        'Check if the issue has been resolved',
        'Contact support with transaction details'
      ]
    },
    es: {
      title: 'Error Inesperado',
      message: 'Ocurrió un error inesperado al procesar tu transacción. Nuestro equipo ha sido notificado.',
      suggestions: [
        'Intenta la transacción nuevamente en unos minutos',
        'Verifica si el problema se ha resuelto',
        'Contacta soporte con los detalles de la transacción'
      ]
    },
    fr: {
      title: 'Erreur Inattendue',
      message: 'Une erreur inattendue s\'est produite lors du traitement de votre transaction. Notre équipe a été notifiée.',
      suggestions: [
        'Essayez à nouveau la transaction dans quelques minutes',
        'Vérifiez si le problème est résolu',
        'Contactez le support avec les détails de la transaction'
      ]
    },
    de: {
      title: 'Unerwarteter Fehler',
      message: 'Ein unerwarteter Fehler ist bei der Verarbeitung Ihrer Transaktion aufgetreten. Unser Team wurde benachrichtigt.',
      suggestions: [
        'Versuchen Sie die Transaktion in ein paar Minuten erneut',
        'Überprüfen Sie, ob das Problem behoben ist',
        'Kontaktieren Sie den Support mit Transaktionsdetails'
      ]
    },
    zh: {
      title: '意外错误',
      message: '处理您的交易时发生了意外错误。我们的团队已收到通知。',
      suggestions: [
        '几分钟后再次尝试交易',
        '检查问题是否已解决',
        '联系支持并提供交易详情'
      ]
    }
  }
};

/**
 * Default message generator instance
 */
export const messageGenerator = new MessageGenerator();