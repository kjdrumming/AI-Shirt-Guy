# Creative T-Shirt Maker with AI & Printify Integration

A modern web application that generates creative t-shirt designs using AI image generation and integrates with Printify's catalog for accurate printing specifications and color options.

## ✨ Features

### Core Functionality
- **AI-Generated Designs**: Create unique t-shirt designs using Stable Diffusion XL via Hugging Face API
- **Smart Mode Toggle**: Switch between AI generation and stock images to save API credits
- **Printify Integration**: Dynamic shirt colors and specifications from Printify's catalog
- **Real-time Preview**: See designs positioned accurately on different colored shirts
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### AI & Design Features
- Multiple design variations per prompt
- Smart prompt suggestions for better results
- Consistent positioning using Printify's coordinate system
- CSS filter-based color transformation for visual consistency
- Error handling with fallback stock images

### Printify Catalog Integration
- **Dynamic Color Loading**: Automatically fetches available shirt colors from Printify API
- **Accurate Positioning**: Uses Printify's [0,0] to [1,1] coordinate system for precise design placement
- **Template Specifications**: Real blueprint dimensions and print area calculations
- **Fallback Support**: Works with static colors when API is unavailable

## 🛠️ Technologies

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **AI Integration**: Hugging Face Inference API (Stable Diffusion XL)
- **Print Integration**: Printify Catalog API
- **Image Processing**: CSS filters for color transformation
- **Development**: Hot Module Replacement, ESLint, TypeScript strict mode

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd creative-shirt-maker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Configure API tokens in `.env`**
   ```env
   # Required: Hugging Face API token
   VITE_HUGGINGFACE_API_TOKEN=your_hugging_face_token

   # Optional: Printify API token (for dynamic colors)
   VITE_PRINTIFY_API_TOKEN=your_printify_token
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 🔑 API Configuration

### Hugging Face API (Required)
1. Visit [Hugging Face](https://huggingface.co/settings/tokens)
2. Create a new access token with "Read" permissions
3. Add to `.env` as `VITE_HUGGINGFACE_API_TOKEN`

### Printify API (Optional)
1. Visit [Printify API Settings](https://printify.com/app/account/api)
2. Generate a personal access token
3. Add to `.env` as `VITE_PRINTIFY_API_TOKEN`

**Note**: The app works without Printify API using fallback colors, but dynamic catalog integration requires the token.

## 🎨 How It Works

### AI Image Generation
1. User enters a creative prompt
2. App generates multiple design variations using Stable Diffusion XL
3. Images are processed and positioned using Printify's coordinate system
4. Designs are displayed with real-time shirt mockups

### Printify Integration
1. Fetches available blueprints and variants from Printify catalog
2. Extracts color options and maps to CSS filters
3. Provides accurate print area specifications
4. Maintains consistent positioning across all shirt colors

### Color System
- **Single Template**: Uses white shirt template as base
- **CSS Filters**: Transforms colors (brightness, hue-rotate, sepia)
- **Dynamic Mapping**: Maps Printify color names to visual filters
- **Fallback Support**: Static colors when API unavailable

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── DesignDisplay.tsx    # Design grid with previews
│   ├── ShirtMockup.tsx      # Shirt visualization component
│   ├── ShirtTemplates.tsx   # Template selection
│   ├── PromptInput.tsx      # AI prompt interface
│   └── OrderSummary.tsx     # Order details
├── services/           # API and business logic
│   ├── huggingface.ts      # AI image generation
│   ├── stockImages.ts      # Fallback image service
│   ├── printifyCatalog.ts  # Printify API integration
│   └── printifyTemplates.ts # Template specifications
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── assets/             # Static assets
└── pages/              # Page components
```

## 🔧 Key Components

### ShirtMockup Component
- Renders designs on shirt templates
- Supports dynamic color transformation
- Uses Printify coordinate system for positioning
- Handles image loading and error states

### Printify Catalog Service
- Fetches blueprints, variants, and colors
- Maps color names to CSS filters
- Caches API responses for performance
- Provides fallback data when offline

### Design Generation Flow
1. **Input**: User prompt + mode selection (AI/Stock)
2. **Processing**: API call or stock image selection
3. **Positioning**: Calculates coordinates using Printify specs
4. **Rendering**: Displays on color-transformed shirt templates

## 🎯 Printify Coordinate System

The app uses Printify's standardized coordinate system:
- **Range**: [0,0] to [1,1] (cartesian coordinates)
- **Center**: x=0.5, y=0.4 (optimized for t-shirt designs)
- **Scale**: 1.0 = full print area width
- **Position**: Relative to print area boundaries

## 🚀 Production Build

```bash
npm run build
```

Optimized production build with:
- Code splitting
- Asset optimization
- TypeScript compilation
- Tailwind CSS purging

## 🛡️ Error Handling

- **API Failures**: Automatic fallback to stock images
- **Image Loading**: Error states with retry options
- **Network Issues**: Graceful degradation
- **Invalid Prompts**: User feedback and suggestions

## 📱 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

**AI generation not working**
- Check Hugging Face API token
- Verify internet connection
- Try stock image mode as fallback

**Colors not loading**
- Printify API token may be missing
- App will use fallback colors automatically
- Check browser console for API errors

**Images not displaying**
- Clear browser cache
- Check image URLs in network tab
- Verify API responses

**Build errors**
- Run `npm install` to update dependencies
- Check TypeScript errors with `npm run type-check`
- Clear `node_modules` and reinstall if needed

### Performance Tips

- Use stock image mode to reduce API usage
- Enable Printify API for better color accuracy
- Clear browser cache if experiencing issues
- Monitor network usage in developer tools

For additional support, check the browser console for detailed error messages.

---

## 🔗 Lovable Project Integration

This project was created using [Lovable](https://lovable.dev/) and can be edited via:

**Project URL**: https://lovable.dev/projects/ce504305-222c-4fec-9687-226766dac6e3

**Deployment**: Click Share -> Publish in Lovable to deploy instantly
**Custom Domain**: Available in Project > Settings > Domains
