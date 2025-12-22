import { GammaClient, GenerateContentParams } from '../src/gamma-client.js';

/**
 * Example LLM Integration with Gamma MCP
 * Shows how an LLM would process user requests and generate artifacts
 */

interface UserRequest {
  prompt: string;
  context?: {
    industry?: string;
    audience?: string;
    brand?: any;
    constraints?: any;
  };
}

interface LLMAnalysis {
  intent: string;
  format: 'presentation' | 'document' | 'social';
  requirements: {
    topic: string;
    depth: 'brief' | 'medium' | 'detailed';
    slides?: number;
    tone: string;
    audience: string;
    visualStyle: string;
  };
  contentStructure: any;
}

class LLMGammaOrchestrator {
  private gammaClient: GammaClient;
  
  constructor(apiKey: string) {
    this.gammaClient = new GammaClient(apiKey);
  }

  /**
   * Main orchestration method - processes user request through LLM pipeline
   */
  async generateArtifact(userRequest: UserRequest) {
    console.log('🤖 LLM Processing Pipeline Started\n');
    
    // Step 1: Analyze user intent
    const analysis = await this.analyzeRequest(userRequest);
    console.log('📊 Analysis Complete:', analysis);
    
    // Step 2: Generate structured content
    const structuredContent = await this.generateStructuredContent(analysis);
    console.log('\n📝 Structured Content Generated');
    
    // Step 3: Map to Gamma parameters
    const gammaParams = await this.mapToGammaParams(analysis, structuredContent);
    console.log('\n🎯 Gamma Parameters Mapped:', JSON.stringify(gammaParams, null, 2));
    
    // Step 4: Generate with Gamma
    const result = await this.gammaClient.generateContent(gammaParams);
    console.log('\n✅ Generation Complete:', result);
    
    // Step 5: Post-process if needed
    if (this.needsRefinement(result, analysis)) {
      return await this.refineGeneration(result, analysis, gammaParams);
    }
    
    return result;
  }

  /**
   * Simulates LLM analysis of user request
   */
  private async analyzeRequest(request: UserRequest): Promise<LLMAnalysis> {
    // In real implementation, this would be actual LLM analysis
    // Here we simulate the analysis process
    
    const prompt = request.prompt.toLowerCase();
    
    // Detect format
    let format: 'presentation' | 'document' | 'social' = 'presentation';
    if (prompt.includes('document') || prompt.includes('report') || prompt.includes('whitepaper')) {
      format = 'document';
    } else if (prompt.includes('social') || prompt.includes('instagram') || prompt.includes('linkedin')) {
      format = 'social';
    }
    
    // Extract requirements
    const requirements = {
      topic: this.extractTopic(prompt),
      depth: this.determineDepth(prompt),
      slides: this.extractSlideCount(prompt) || (format === 'presentation' ? 10 : undefined),
      tone: this.determineTone(prompt, request.context),
      audience: request.context?.audience || this.inferAudience(prompt),
      visualStyle: this.determineVisualStyle(prompt, request.context)
    };
    
    return {
      intent: this.classifyIntent(prompt),
      format,
      requirements,
      contentStructure: this.planContentStructure(requirements)
    };
  }

  /**
   * Generate structured content based on analysis
   */
  private async generateStructuredContent(analysis: LLMAnalysis): Promise<string> {
    const { requirements, format, contentStructure } = analysis;
    
    // This simulates LLM content generation
    // In production, this would use actual LLM to generate content
    
    let content = `# ${requirements.topic}\n\n`;
    
    if (format === 'presentation') {
      content += this.generatePresentationContent(contentStructure, requirements);
    } else if (format === 'document') {
      content += this.generateDocumentContent(contentStructure, requirements);
    } else {
      content += this.generateSocialContent(contentStructure, requirements);
    }
    
    return content;
  }

  /**
   * Map LLM analysis and content to Gamma API parameters
   */
  private async mapToGammaParams(
    analysis: LLMAnalysis, 
    content: string
  ): Promise<GenerateContentParams> {
    const { format, requirements } = analysis;
    
    // Intelligent parameter mapping
    const params: GenerateContentParams = {
      inputText: content,
      format: format,
      textMode: this.selectTextMode(requirements.depth),
      numCards: requirements.slides,
      
      textOptions: {
        amount: requirements.depth,
        tone: requirements.tone,
        audience: requirements.audience,
        language: 'English' // Could be detected/specified
      },
      
      imageOptions: {
        source: this.selectImageSource(requirements.visualStyle),
        style: requirements.visualStyle,
        model: 'dalle-3' // Could vary based on requirements
      }
    };
    
    // Add theme based on context
    params.themeName = this.selectTheme(requirements.tone, requirements.audience);
    
    return params;
  }

  // Helper methods for LLM-like processing

  private extractTopic(prompt: string): string {
    // Extract main topic from prompt
    const matches = prompt.match(/(?:about|on|regarding|for)\s+(.+?)(?:\.|,|$)/i);
    return matches ? matches[1].trim() : 'General Topic';
  }

  private determineDepth(prompt: string): 'brief' | 'medium' | 'detailed' {
    if (prompt.includes('quick') || prompt.includes('brief') || prompt.includes('summary')) {
      return 'brief';
    }
    if (prompt.includes('detailed') || prompt.includes('comprehensive') || prompt.includes('deep')) {
      return 'detailed';
    }
    return 'medium';
  }

  private extractSlideCount(prompt: string): number | undefined {
    const matches = prompt.match(/(\d+)\s*(?:slide|page|card)/i);
    return matches ? parseInt(matches[1]) : undefined;
  }

  private determineTone(prompt: string, context?: any): string {
    if (prompt.includes('formal') || prompt.includes('professional')) return 'professional';
    if (prompt.includes('casual') || prompt.includes('friendly')) return 'casual';
    if (prompt.includes('persuasive') || prompt.includes('sales')) return 'persuasive';
    if (context?.industry === 'tech') return 'technical';
    return 'professional';
  }

  private inferAudience(prompt: string): string {
    if (prompt.includes('investor') || prompt.includes('vc')) return 'investors';
    if (prompt.includes('executive') || prompt.includes('c-suite')) return 'executives';
    if (prompt.includes('team') || prompt.includes('internal')) return 'team members';
    if (prompt.includes('customer') || prompt.includes('client')) return 'customers';
    return 'general audience';
  }

  private determineVisualStyle(prompt: string, context?: any): string {
    if (prompt.includes('modern') || prompt.includes('sleek')) return 'modern';
    if (prompt.includes('minimal') || prompt.includes('clean')) return 'minimal';
    if (prompt.includes('creative') || prompt.includes('artistic')) return 'creative';
    if (context?.brand?.style) return context.brand.style;
    return 'professional';
  }

  private classifyIntent(prompt: string): string {
    if (prompt.includes('pitch') || prompt.includes('investor')) return 'pitch';
    if (prompt.includes('report') || prompt.includes('analysis')) return 'report';
    if (prompt.includes('training') || prompt.includes('educational')) return 'education';
    if (prompt.includes('marketing') || prompt.includes('promotional')) return 'marketing';
    return 'general';
  }

  private planContentStructure(requirements: any): any {
    // Plan the content structure based on requirements
    return {
      sections: this.determineSections(requirements),
      flow: this.determineFlow(requirements),
      emphasis: this.determineEmphasis(requirements)
    };
  }

  private selectTextMode(depth: string): 'generate' | 'condense' | 'preserve' {
    switch (depth) {
      case 'brief': return 'condense';
      case 'detailed': return 'generate';
      default: return 'generate';
    }
  }

  private selectImageSource(style: string): 'aiGenerated' | 'unsplash' | 'giphy' | 'none' {
    if (style === 'creative' || style === 'modern') return 'aiGenerated';
    if (style === 'minimal') return 'unsplash';
    if (style === 'fun' || style === 'casual') return 'giphy';
    return 'aiGenerated';
  }

  private selectTheme(tone: string, audience: string): string {
    const themeMap: Record<string, string> = {
      'professional-investors': 'pitch',
      'professional-executives': 'corporate',
      'technical-team members': 'tech',
      'casual-general audience': 'friendly',
      'persuasive-customers': 'sales'
    };
    
    const key = `${tone}-${audience}`;
    return themeMap[key] || 'modern';
  }

  private needsRefinement(result: any, analysis: LLMAnalysis): boolean {
    // Check if generation needs refinement
    return result.status === 'error' || 
           (result.message && result.message.includes('retry'));
  }

  private async refineGeneration(result: any, analysis: LLMAnalysis, originalParams: GenerateContentParams) {
    console.log('\n🔄 Refining generation...');
    
    // Adjust parameters based on error
    const refinedParams = { ...originalParams };
    
    if (result.error?.includes('too long')) {
      refinedParams.textMode = 'condense';
      refinedParams.numCards = Math.min(originalParams.numCards || 10, 30);
    }
    
    return await this.gammaClient.generateContent(refinedParams);
  }

  // Content generation helpers (simulate LLM content generation)

  private generatePresentationContent(structure: any, requirements: any): string {
    const slides = requirements.slides || 10;
    let content = '';
    
    for (let i = 1; i <= slides; i++) {
      content += `## Slide ${i}: ${this.getSlideTitle(i, requirements.topic)}\n`;
      content += this.getSlideContent(i, requirements) + '\n\n';
    }
    
    return content;
  }

  private generateDocumentContent(structure: any, requirements: any): string {
    return `## Executive Summary\n${this.generateSummary(requirements)}\n\n` +
           `## Introduction\n${this.generateIntroduction(requirements)}\n\n` +
           `## Main Content\n${this.generateMainContent(requirements)}\n\n` +
           `## Conclusion\n${this.generateConclusion(requirements)}`;
  }

  private generateSocialContent(structure: any, requirements: any): string {
    return `**${requirements.topic}**\n\n` +
           `${this.generateSocialHook(requirements)}\n\n` +
           `Key Points:\n${this.generateKeyPoints(requirements)}\n\n` +
           `#AI #Innovation #Technology`;
  }

  // Placeholder methods for content generation
  private getSlideTitle(index: number, topic: string): string {
    const titles = [
      'Introduction', 'Problem Statement', 'Solution Overview', 
      'Key Features', 'Market Analysis', 'Business Model',
      'Competitive Advantage', 'Roadmap', 'Team', 'Call to Action'
    ];
    return titles[index - 1] || `${topic} - Part ${index}`;
  }

  private getSlideContent(index: number, requirements: any): string {
    return `- Key point about ${requirements.topic}\n` +
           `- Supporting data and evidence\n` +
           `- Compelling insight or statistic`;
  }

  private generateSummary(req: any): string {
    return `This ${req.topic} provides comprehensive insights...`;
  }

  private generateIntroduction(req: any): string {
    return `In today's rapidly evolving landscape, ${req.topic} has become...`;
  }

  private generateMainContent(req: any): string {
    return `The main aspects of ${req.topic} include...`;
  }

  private generateConclusion(req: any): string {
    return `In conclusion, ${req.topic} represents a significant opportunity...`;
  }

  private generateSocialHook(req: any): string {
    return `🚀 Exciting developments in ${req.topic}!`;
  }

  private generateKeyPoints(req: any): string {
    return `• Innovation at its finest\n• Game-changing technology\n• Future is here`;
  }

  private determineSections(req: any): string[] {
    return ['intro', 'problem', 'solution', 'benefits', 'conclusion'];
  }

  private determineFlow(req: any): string {
    return 'logical-progression';
  }

  private determineEmphasis(req: any): string[] {
    return ['key-metrics', 'visual-data', 'call-to-action'];
  }
}

// Example usage
async function demonstrateLLMIntegration() {
  const orchestrator = new LLMGammaOrchestrator(process.env.GAMMA_API_KEY!);
  
  // Example 1: Investor Pitch
  console.log('=== Example 1: Investor Pitch ===\n');
  await orchestrator.generateArtifact({
    prompt: "Create a 12-slide investor pitch deck for an AI-powered healthcare startup that helps doctors diagnose rare diseases. Make it professional and data-driven.",
    context: {
      industry: 'healthcare',
      audience: 'venture capitalists',
      brand: { style: 'modern' }
    }
  });
  
  // Example 2: Educational Content
  console.log('\n\n=== Example 2: Educational Content ===\n');
  await orchestrator.generateArtifact({
    prompt: "Generate a comprehensive guide about machine learning basics for beginners. Should be detailed with examples.",
    context: {
      audience: 'students',
      constraints: { maxLength: 20 }
    }
  });
  
  // Example 3: Social Media Campaign
  console.log('\n\n=== Example 3: Social Media Campaign ===\n');
  await orchestrator.generateArtifact({
    prompt: "Create social media content announcing our new product launch. Make it exciting and shareable.",
    context: {
      audience: 'tech enthusiasts',
      brand: { 
        style: 'creative',
        colors: ['#667eea', '#764ba2']
      }
    }
  });
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateLLMIntegration().catch(console.error);
}

export { LLMGammaOrchestrator, UserRequest, LLMAnalysis };