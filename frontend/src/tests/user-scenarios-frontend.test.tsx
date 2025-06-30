import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import '@testing-library/jest-dom';

import Home from '../pages/Home';
import Forum from '../pages/Forum';
import Login from '../pages/Login';
import JoinCommunity from '../pages/JoinCommunity';
import authService from '../services/authService';

const server = setupServer(
  rest.post('/api/auth/login', (req, res, ctx) => {
    const { email, password } = req.body as any;
    
    if (email === 'admin@meumt.com' && password === 'admin123456') {
      return res(ctx.status(200), ctx.json({
        success: true,
        token: 'admin-token',
        user: { id: '1', email, role: 'admin', username: 'admin' }
      }));
    }
    
    if (email === 'user@test.com' && password === 'password') {
      return res(ctx.status(200), ctx.json({
        success: true,
        token: 'user-token',
        user: { id: '2', email, role: 'user', username: 'testuser' }
      }));
    }
    
    return res(ctx.status(401), ctx.json({
      success: false,
      message: 'Geçersiz e-posta veya şifre'
    }));
  }),
  
  rest.post('/api/songs/suggest', (req, res, ctx) => {
    const token = req.headers.get('Authorization');
    
    if (!token) {
      return res(ctx.status(401), ctx.json({
        success: false,
        message: 'Token gereklidir'
      }));
    }
    
    return res(ctx.status(201), ctx.json({
      success: true,
      data: { id: '1', status: 'pending' }
    }));
  }),
  
  rest.post('/api/forum/posts/:id/comments', (req, res, ctx) => {
    const token = req.headers.get('Authorization');
    
    if (!token) {
      return res(ctx.status(401), ctx.json({
        success: false,
        message: 'Giriş yapmalısınız'
      }));
    }
    
    return res(ctx.status(201), ctx.json({
      success: true,
      data: { id: '1', content: 'Test yorumu' }
    }));
  }),
  
  rest.post('/api/community/apply', (req, res, ctx) => {
    const { fullName, email, tcKimlikNo, studentNumber } = req.body as any;
    
    if (!fullName || !email || !tcKimlikNo || !studentNumber) {
      return res(ctx.status(400), ctx.json({
        success: false,
        message: 'Tüm alanlar gereklidir'
      }));
    }
    
    if (tcKimlikNo.length !== 11) {
      return res(ctx.status(400), ctx.json({
        success: false,
        message: 'TC Kimlik numarası 11 haneli olmalıdır'
      }));
    }
    
    if (studentNumber === '99999999') {
      return res(ctx.status(403), ctx.json({
        success: false,
        message: 'Topluluk üyesi olarak bulunamadınız'
      }));
    }
    
    return res(ctx.status(201), ctx.json({
      success: true,
      message: 'Başvurunuz başarıyla alındı'
    }));
  }),
  
  rest.get('/api/website/hero', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({
      success: true,
      data: [
        {
          _id: '1',
          title: 'Test Hero',
          subtitle: 'Test Subtitle',
          description: 'Test Description',
          backgroundImage: 'test-bg.jpg',
          isActive: true,
          order: 1
        }
      ]
    }));
  }),
  
  rest.get('/api/events', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({
      success: true,
      data: []
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Frontend Kullanıcı Senaryoları Testleri', () => {
  
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('1. Normal Kullanıcı Testleri (Giriş yapmamış)', () => {
    
    describe('A1) Şarkı önerme kontrolü', () => {
      test('Giriş yapmamış kullanıcıya şarkı öner uyarısı gösterilir', async () => {
        renderWithRouter(<Home />);
        
        await waitFor(() => {
          const songButton = screen.getByText('Şarkı Öner');
          expect(songButton).toBeInTheDocument();
        });
        
        const songButton = screen.getByText('Şarkı Öner');
        
        const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
        fireEvent.click(songButton);
        
        expect(alertSpy).toHaveBeenCalledWith('Şarkı önermek için giriş yapmalısınız');
        alertSpy.mockRestore();
      });
    });

    describe('A2) Forum yorum kontrolü', () => {
      test('Giriş yapmamış kullanıcı forum yorumu yapamaz uyarısı', async () => {
        server.use(
          rest.get('/api/forum/posts', (req, res, ctx) => {
            return res(ctx.status(200), ctx.json({
              success: true,
              data: [
                {
                  _id: '1',
                  title: 'Test Forum Post',
                  content: 'Test content',
                  author: { name: 'Test User' },
                  createdAt: new Date().toISOString()
                }
              ]
            }));
          })
        );
        
        renderWithRouter(<Forum />);
        
        await waitFor(() => {
          const forumPost = screen.getByText('Test Forum Post');
          expect(forumPost).toBeInTheDocument();
        });
        
        const forumPost = screen.getByText('Test Forum Post');
        fireEvent.click(forumPost);
        
        await waitFor(() => {
          const warning = screen.queryByText(/giriş yap/i);
          expect(warning).toBeInTheDocument();
        });
      });
    });

    describe('A3) Topluluğa üye olma form kontrolü', () => {
      test('Eksik bilgilerle form gönderildiğinde hata mesajı görüntülenir', async () => {
        renderWithRouter(<JoinCommunity />);
        
        const submitButton = screen.getByText(/başvur/i);
        fireEvent.click(submitButton);
        
        await waitFor(() => {
          const errorMessage = screen.getByText(/gerekli/i);
          expect(errorMessage).toBeInTheDocument();
        });
      });

      test('Geçersiz TC Kimlik No ile hata mesajı', async () => {
        renderWithRouter(<JoinCommunity />);
        
        fireEvent.change(screen.getByLabelText(/ad.*soyad/i), {
          target: { value: 'Test User' }
        });
        fireEvent.change(screen.getByLabelText(/e-posta/i), {
          target: { value: 'test@example.com' }
        });
        fireEvent.change(screen.getByLabelText(/tc.*kimlik/i), {
          target: { value: '12345' } // Geçersiz TC
        });
        fireEvent.change(screen.getByLabelText(/öğrenci.*numara/i), {
          target: { value: '20210001' }
        });
        
        const submitButton = screen.getByText(/başvur/i);
        fireEvent.click(submitButton);
        
        await waitFor(() => {
          const errorMessage = screen.getByText(/11 haneli/i);
          expect(errorMessage).toBeInTheDocument();
        });
      });

      test('Doğru formatla başvuru başarılı', async () => {
        renderWithRouter(<JoinCommunity />);
        
        fireEvent.change(screen.getByLabelText(/ad.*soyad/i), {
          target: { value: 'Valid Test User' }
        });
        fireEvent.change(screen.getByLabelText(/e-posta/i), {
          target: { value: 'validtest@example.com' }
        });
        fireEvent.change(screen.getByLabelText(/tc.*kimlik/i), {
          target: { value: '12345678901' }
        });
        fireEvent.change(screen.getByLabelText(/öğrenci.*numara/i), {
          target: { value: '20210001' }
        });
        
        const submitButton = screen.getByText(/başvur/i);
        fireEvent.click(submitButton);
        
        await waitFor(() => {
          const successMessage = screen.getByText(/başarıyla alındı/i);
          expect(successMessage).toBeInTheDocument();
        });
      });
    });

    describe('A4) Google Sheets öğrenci numarası kontrolü', () => {
      test('Sheets\'te olmayan öğrenci numarası hata mesajı', async () => {
        renderWithRouter(<JoinCommunity />);
        
        fireEvent.change(screen.getByLabelText(/ad.*soyad/i), {
          target: { value: 'Invalid Student' }
        });
        fireEvent.change(screen.getByLabelText(/e-posta/i), {
          target: { value: 'invalid@example.com' }
        });
        fireEvent.change(screen.getByLabelText(/tc.*kimlik/i), {
          target: { value: '12345678901' }
        });
        fireEvent.change(screen.getByLabelText(/öğrenci.*numara/i), {
          target: { value: '99999999' } // Sheets'te olmayan numara
        });
        
        const submitButton = screen.getByText(/başvur/i);
        fireEvent.click(submitButton);
        
        await waitFor(() => {
          const errorMessage = screen.getByText(/topluluk üyesi.*bulunamadınız/i);
          expect(errorMessage).toBeInTheDocument();
        });
      });
    });
  });

  describe('2. Kayıtlı Kullanıcı Testleri', () => {
    
    beforeEach(() => {
      localStorage.setItem('token', 'user-token');
      localStorage.setItem('user', JSON.stringify({
        id: '2',
        email: 'user@test.com',
        role: 'user',
        username: 'testuser'
      }));
    });

    describe('A1) Giriş testi', () => {
      test('Doğru bilgilerle giriş yapabilir', async () => {
        renderWithRouter(<Login />);
        
        fireEvent.change(screen.getByLabelText(/e-posta/i), {
          target: { value: 'user@test.com' }
        });
        fireEvent.change(screen.getByLabelText(/şifre/i), {
          target: { value: 'password' }
        });
        
        const loginButton = screen.getByText(/giriş yap/i);
        fireEvent.click(loginButton);
        
        await waitFor(() => {
          expect(window.location.pathname).toBe('/');
        });
      });

      test('Yanlış şifre ile giriş yapamaz', async () => {
        renderWithRouter(<Login />);
        
        fireEvent.change(screen.getByLabelText(/e-posta/i), {
          target: { value: 'user@test.com' }
        });
        fireEvent.change(screen.getByLabelText(/şifre/i), {
          target: { value: 'wrongpassword' }
        });
        
        const loginButton = screen.getByText(/giriş yap/i);
        fireEvent.click(loginButton);
        
        await waitFor(() => {
          const errorMessage = screen.getByText(/geçersiz.*şifre/i);
          expect(errorMessage).toBeInTheDocument();
        });
      });
    });

    describe('A2) Forum yorum testleri', () => {
      test('Kayıtlı kullanıcı yorum atabilir', async () => {
        server.use(
          rest.get('/api/forum/posts', (req, res, ctx) => {
            return res(ctx.status(200), ctx.json({
              success: true,
              data: [
                {
                  _id: '1',
                  title: 'Test Forum Post',
                  content: 'Test content',
                  author: { name: 'Test User' },
                  createdAt: new Date().toISOString()
                }
              ]
            }));
          })
        );
        
        renderWithRouter(<Forum />);
        
        await waitFor(() => {
          const forumPost = screen.getByText('Test Forum Post');
          fireEvent.click(forumPost);
        });
        
        await waitFor(() => {
          const commentInput = screen.getByPlaceholderText(/yorum/i);
          fireEvent.change(commentInput, {
            target: { value: 'Bu bir test yorumudur' }
          });
        });
        
        const submitButton = screen.getByText(/gönder/i);
        fireEvent.click(submitButton);
        
        await waitFor(() => {
          expect(screen.queryByText('Bu bir test yorumudur')).toBeInTheDocument();
        });
      });
    });

    describe('A4) Şarkı önerme testleri', () => {
      test('Kayıtlı kullanıcı şarkı önerebilir', async () => {
        renderWithRouter(<Home />);
        
        await waitFor(() => {
          const songButton = screen.getByText('Şarkı Öner');
          fireEvent.click(songButton);
        });
        
        await waitFor(() => {
          const modal = screen.getByText(/şarkı öner/i);
          expect(modal).toBeInTheDocument();
        });
        
        fireEvent.change(screen.getByLabelText(/şarkı.*link/i), {
          target: { value: 'https://open.spotify.com/track/test123' }
        });
        fireEvent.change(screen.getByLabelText(/şarkı.*ad/i), {
          target: { value: 'Önerilen Şarkı' }
        });
        fireEvent.change(screen.getByLabelText(/sanatçı/i), {
          target: { value: 'Önerilen Sanatçı' }
        });
        
        const submitButton = screen.getByText(/gönder/i);
        fireEvent.click(submitButton);
        
        await waitFor(() => {
          const successMessage = screen.getByText(/başarıyla gönderildi/i);
          expect(successMessage).toBeInTheDocument();
        });
      });
    });
  });

  describe('3. Admin Testleri', () => {
    
    beforeEach(() => {
      localStorage.setItem('token', 'admin-token');
      localStorage.setItem('user', JSON.stringify({
        id: '1',
        email: 'admin@meumt.com',
        role: 'admin',
        username: 'admin'
      }));
    });

    describe('A1) Admin giriş testi', () => {
      test('Admin doğru bilgilerle giriş yapabilir', async () => {
        localStorage.clear(); // Giriş öncesi temizle
        
        renderWithRouter(<Login />);
        
        fireEvent.change(screen.getByLabelText(/e-posta/i), {
          target: { value: 'admin@meumt.com' }
        });
        fireEvent.change(screen.getByLabelText(/şifre/i), {
          target: { value: 'admin123456' }
        });
        
        const loginButton = screen.getByText(/giriş yap/i);
        fireEvent.click(loginButton);
        
        await waitFor(() => {
          expect(window.location.pathname).toBe('/');
        });
      });
    });

    describe('Admin Panel Erişimi', () => {
      test('Admin paneli menüsü görünür', async () => {
        renderWithRouter(<Home />);
        
        await waitFor(() => {
          const adminMenu = screen.queryByText(/admin/i);
          expect(adminMenu).toBeInTheDocument();
        });
      });
    });
  });
}); 